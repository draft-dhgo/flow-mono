# StartWorkflowRunUseCase 리팩터링 — 단일 책임 분리

## 실행 커맨드

```
/ralph-loop "loop-save/refactor-start-workflow-run.md 파일을 읽고 스펙에 따라 StartWorkflowRunUseCase를 리팩터링하라. 완료되면 promise 태그로 USE CASE REFACTORED를 출력하라." --completion-promise "USE CASE REFACTORED" --max-iterations 15
```

---

## 배경

`StartWorkflowRunUseCase`(111줄)가 다음 6가지 책임을 모두 담당하고 있다:
1. 워크플로우 설정 조회
2. WorkflowRun 생성
3. WorkExecution 생성 (반복문)
4. Report 생성 (ReportOutline 파싱 포함)
5. 3개 Repository에 각각 저장
6. 도메인 이벤트 수집 및 발행

이를 분리하여 Use Case는 **오케스트레이션 역할**만 하고, 복잡한 생성 로직은 Domain Service 또는 Factory로 위임한다.

---

## 전제 조건

- `loop-save/fix-code-quality.md`가 먼저 완료되어 `as any`가 제거된 상태
- `loop-save/add-application-tests.md`가 먼저 완료되어 StartWorkflowRunUseCase 테스트가 존재하는 상태
- 먼저 `npm run test`를 실행하여 기존 테스트가 통과하는지 확인. 통과하지 않으면 중단하고 <promise>REFACTOR BLOCKED</promise> 출력

---

## Phase 1: 분석 및 설계

리팩터링 전에 반드시 다음을 수행:

1. `src/workflow-runtime/application/use-cases/start-workflow-run-use-case.ts` 전체를 읽는다
2. 이 Use Case가 의존하는 모든 엔티티/VO의 create 시그니처를 확인한다:
   - WorkflowRun.create()
   - WorkExecution.create()
   - Report.create()
   - ReportOutline.create()
   - Section.create()
3. 기존 테스트(있다면)를 읽어서 검증 범위를 확인한다
4. 추출할 책임의 경계를 결정한다

### 추출 대상

```
현재 UseCase 내부:
┌──────────────────────────────────────────┐
│ 1. configReader.findById()               │ → UseCase 유지
│ 2. WorkflowRun.create()                  │ → UseCase 유지
│ 3. for (workDef) {                       │
│    ├─ taskDef → Report 생성              │ → Factory로 추출
│    ├─ WorkExecution.create()             │ → Factory로 추출
│    └─ run.addWorkExecution()             │ → Factory로 추출
│ }                                        │
│ 4. run.start()                           │ → UseCase 유지
│ 5. repository.save() ×3                  │ → UseCase 유지
│ 6. eventPublisher.publishAll()           │ → UseCase 유지
└──────────────────────────────────────────┘
```

---

## Phase 2: WorkflowRunFactory 생성

### 파일: `src/workflow-runtime/domain/services/workflow-run-factory.ts`

(또는 `src/workflow-runtime/application/factories/` — 프로젝트 컨벤션에 맞게 판단)

Factory의 책임:
- WorkflowConfig를 받아서 WorkflowRun + WorkExecution[] + Report[]를 한 번에 생성
- 내부적으로 work/task 반복문과 Report 생성 로직을 캡슐화
- 생성된 객체들을 구조화된 결과로 반환

```typescript
// 기대하는 인터페이스 (예시)
export interface WorkflowRunBuildResult {
  readonly run: WorkflowRun;
  readonly workExecutions: ReadonlyArray<WorkExecution>;
  readonly reports: ReadonlyArray<Report>;
}

export class WorkflowRunFactory {
  build(config: WorkflowConfig): WorkflowRunBuildResult {
    // 기존 for 루프 로직을 여기로 이동
  }
}
```

### 규칙
- Factory는 **순수 함수** (또는 side-effect 없는 메서드)
- Repository/EventPublisher 의존성 없음
- 도메인 객체 생성만 담당
- 테스트가 매우 쉬워야 함

---

## Phase 3: UseCase 단순화

Factory 생성 후 UseCase를 리팩터링:

```typescript
// 기대하는 최종 모습 (의사코드)
export class StartWorkflowRunUseCase {
  constructor(
    private readonly deps: StartWorkflowRunDeps & { factory: WorkflowRunFactory },
  ) {}

  async execute(command: StartWorkflowRunCommand): Promise<StartWorkflowRunResult> {
    const config = await this.deps.workflowConfigReader.findById(command.workflowId);
    if (!config) throw new WorkflowNotFoundError(command.workflowId);

    const { run, workExecutions, reports } = this.deps.factory.build(config);
    run.start();

    // 영속화
    await this.deps.workflowRunRepository.save(run);
    await this.deps.workExecutionRepository.saveAll(workExecutions);
    for (const report of reports) {
      await this.deps.reportRepository.save(report);
    }

    // 이벤트 발행
    const allEvents = [
      ...run.clearDomainEvents(),
      ...workExecutions.flatMap((we) => we.clearDomainEvents()),
      ...reports.flatMap((r) => r.clearDomainEvents()),
    ];
    await this.deps.eventPublisher.publishAll(allEvents);

    return { workflowRunId: run.id, status: run.status };
  }
}
```

### 핵심 원칙
- UseCase는 **호출 순서 조정**(orchestration)만 담당
- 객체 생성 로직은 Factory에 위임
- 기존 에러 처리(try-catch) 유지
- 기존 테스트가 깨지지 않아야 함

---

## Phase 4: Factory 테스트 추가

### 파일: `tests/unit/application/workflow-runtime/workflow-run-factory.test.ts` (또는 domain/services/ 아래)

검증 포인트:
- WorkflowConfig를 주면 올바른 수의 WorkExecution이 생성되는지
- TaskDefinition에 reportOutline이 있으면 Report가 생성되는지
- reportOutline이 없으면 Report가 생성되지 않는지
- 모든 ID가 유효한 Branded Type인지 (as any 없이)
- run.addWorkExecution이 올바른 순서로 호출되었는지

---

## Phase 5: 기존 테스트 수정 및 전체 검증

1. 기존 StartWorkflowRunUseCase 테스트가 있다면 Factory 의존성 주입에 맞게 수정
2. `npm run test` 전체 통과 확인
3. `npm run lint` 에러 없음 확인
4. `npm run typecheck` 통과 확인

---

## 완료 조건

When complete:
- WorkflowRunFactory(또는 동등한 Factory/Builder)가 별도 파일로 존재
- StartWorkflowRunUseCase가 40줄 이하로 단순화 (오케스트레이션만)
- Factory에 대한 단위 테스트 존재
- UseCase의 기존 테스트가 통과 (mock 수정 포함)
- `npm run test` 전체 통과
- `npm run lint` 에러/경고 0
- `npm run typecheck` 통과
- Output: <promise>USE CASE REFACTORED</promise>

---

## 자기 수정 루프

1. 현재 UseCase 전체를 읽는다
2. 관련 엔티티의 create 시그니처를 확인한다
3. Factory 클래스를 작성한다
4. `npm run typecheck` 실행 — 타입 에러 수정
5. UseCase를 Factory 사용으로 리팩터링한다
6. `npm run typecheck` 실행 — 타입 에러 수정
7. Factory 테스트를 작성한다
8. `npm run test` 실행
9. 실패 시:
   a. Factory 로직 오류 → 소스 엔티티를 다시 읽고 수정
   b. UseCase mock 불일치 → deps 인터페이스에 factory 추가
   c. import 경로 오류 → 수정
10. `npm run test` + `npm run lint` 모두 통과할 때까지 반복

---

## 주의사항

- 기존 동작을 변경하지 않는다 (리팩터링만)
- 새로운 기능을 추가하지 않는다
- barrel export(index.ts)를 업데이트하여 Factory가 외부에서 접근 가능하게 한다
- 영속화 순서는 변경하지 않는다 (run → workExecutions → reports)
