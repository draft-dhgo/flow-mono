# 마스터 개선 루프 — 5단계 순차 실행

## 실행 커맨드

```
/ralph-loop "loop-save/master-improvement.md 파일을 읽고 5단계를 순차적으로 실행하라. 각 단계의 게이트 조건을 반드시 통과해야 다음 단계로 진행한다. 모든 단계가 완료되면 promise 태그로 ALL IMPROVEMENTS COMPLETE를 출력하라." --completion-promise "ALL IMPROVEMENTS COMPLETE" --max-iterations 50
```

---

## 실행 원칙

1. **반드시 순차 실행**: STEP 1 → 2 → 3 → 4 → 5 순서를 지킨다
2. **게이트 통과 필수**: 각 STEP 완료 후 게이트 검증을 통과해야 다음 STEP 진행
3. **게이트 실패 시**: 해당 STEP 내에서 문제를 수정하고 게이트를 재검증한다
4. **STEP 스킵 금지**: 이전 STEP이 완료되지 않으면 절대 다음으로 넘어가지 않는다
5. **각 STEP의 상세 스펙**: `loop-save/` 하위의 개별 문서를 반드시 읽고 따른다

---

## STEP 1: 테스트 인프라 복구

### 상세 스펙: `loop-save/fix-test-infra.md` 를 먼저 읽어라

### 요약
- vitest.config.ts의 resolve alias를 tsconfig.json paths와 일치시킨다
- 모든 테스트 파일의 import 경로를 `@domain/{feature}/...` → `@{feature}/domain/...`으로 변환한다

### 작업

1. `loop-save/fix-test-infra.md` 전체를 읽는다
2. vitest.config.ts alias를 수정한다:
   - `@domain` → 제거
   - `@application` → 제거
   - `@infrastructure` → 제거
   - `@presentation` → 제거
   - `@shared` → 제거
   - 추가: `@workflow`, `@workflow-runtime`, `@git`, `@mcp`, `@agent` (각각 `./src/{feature}` 경로)
3. 모든 `tests/**/*.test.ts`의 import 경로를 변환한다
4. `npm run test` 실행

### 자기 수정
- 테스트 실패 시 에러 메시지를 분석하여 import 경로 재수정
- 테스트 통과할 때까지 반복

### GATE 1 — 다음 조건 **모두** 통과해야 STEP 2로 진행:
```bash
npm run test        # ✅ 6개 테스트 파일 전체 통과 (0 failures)
npm run typecheck   # ✅ 0 errors
```

게이트 통과 시 다음을 출력: `[GATE 1 PASSED] 테스트 인프라 복구 완료`

---

## STEP 2: 코드 품질 수정

### 상세 스펙: `loop-save/fix-code-quality.md` 를 먼저 읽어라

### 요약
- 미사용 import 제거 (GitId, EventPublisher)
- branch-name.ts 정규식 ESLint 에러 수정
- `as any` 캐스팅 제거 (StartWorkflowRunUseCase)
- 테스트 파일의 any 경고 수정

### 작업

1. `loop-save/fix-code-quality.md` 전체를 읽는다
2. 미사용 import 제거:
   - `src/common/ports/workflow-config-reader.ts` → `GitId` 제거
   - `src/workflow-runtime/application/event-handlers/query-responded-handler.ts` → `EventPublisher` 제거
3. `src/workflow/domain/value-objects/branch-name.ts` 정규식 수정
4. `src/workflow-runtime/application/use-cases/start-workflow-run-use-case.ts`의 `as any` 제거
   - 관련 엔티티(WorkExecution, TaskExecution, Report)의 create 시그니처를 먼저 읽고 최소 변경 전략 선택
5. 테스트 파일의 any 경고 수정
6. `npm run lint` 실행

### 자기 수정
- lint 에러 남아있으면 에러 메시지를 분석하여 재수정
- typecheck 에러 시 소스와 타입 비교하여 수정
- 통과할 때까지 반복

### GATE 2 — 다음 조건 **모두** 통과해야 STEP 3로 진행:
```bash
npm run lint        # ✅ 0 errors, 0 warnings
npm run typecheck   # ✅ 0 errors
npm run test        # ✅ 기존 테스트 깨지지 않음
```

게이트 통과 시 다음을 출력: `[GATE 2 PASSED] 코드 품질 수정 완료`

---

## STEP 3: Application 레이어 테스트 추가

### 상세 스펙: `loop-save/add-application-tests.md` 를 먼저 읽어라

### 요약
- Use Case 단위 테스트 추가 (Git, MCP, Workflow, Workflow-Runtime)
- Event Handler 단위 테스트 추가 (GitDeletedHandler, WorkExecutionCompletedHandler)
- 모든 Port는 vi.fn() 인라인 mock으로 구현

### 작업

1. `loop-save/add-application-tests.md` 전체를 읽는다
2. Phase 1: 간단한 Use Case부터 — CreateGitUseCase, DeleteGitUseCase, RegisterMcpServerUseCase, UnregisterMcpServerUseCase
   - 각 Use Case 소스를 먼저 읽고, mock 작성, 테스트 작성
3. Phase 2: Workflow Use Case — CreateWorkflowUseCase + GitDeletedHandler + McpServerUnregisteredHandler
4. Phase 3: Workflow-Runtime Use Case — CancelWorkflowRunUseCase, StartWorkflowRunUseCase, WorkExecutionCompletedHandler
5. 각 테스트 파일 작성 후 `npm run test` 실행

### 자기 수정
- mock 불일치 → 소스의 실제 시그니처와 비교
- assertion 실패 → 소스 로직을 다시 읽고 기대값 수정
- import 경로 오류 → 경로 수정
- 테스트 통과할 때까지 반복

### GATE 3 — 다음 조건 **모두** 통과해야 STEP 4로 진행:
```bash
npm run test        # ✅ 기존 + 신규 테스트 전체 통과 (신규 최소 10개 파일)
npm run lint        # ✅ 0 errors
npm run typecheck   # ✅ 0 errors
```

게이트 통과 시 다음을 출력: `[GATE 3 PASSED] Application 테스트 추가 완료`

---

## STEP 4: StartWorkflowRunUseCase 리팩터링

### 상세 스펙: `loop-save/refactor-start-workflow-run.md` 를 먼저 읽어라

### 요약
- WorkflowRunFactory(또는 Builder) 추출 — 복잡한 생성 로직 캡슐화
- UseCase를 오케스트레이션 역할로 단순화 (40줄 이하 목표)
- Factory 단위 테스트 추가

### 작업

1. `loop-save/refactor-start-workflow-run.md` 전체를 읽는다
2. 현재 UseCase와 관련 엔티티의 create 시그니처를 읽는다
3. WorkflowRunFactory 작성 (domain/services/ 또는 application/factories/)
4. UseCase에서 Factory를 사용하도록 변경
5. Factory 단위 테스트 작성
6. 기존 UseCase 테스트 수정 (Factory 의존성 추가)

### 자기 수정
- typecheck 에러 → 타입 수정
- 기존 테스트 실패 → mock에 factory 추가, assertion 수정
- 새 Factory 테스트 실패 → 로직 재확인
- 통과할 때까지 반복

### GATE 4 — 다음 조건 **모두** 통과해야 STEP 5로 진행:
```bash
npm run test        # ✅ 전체 통과 (Factory 테스트 포함)
npm run lint        # ✅ 0 errors
npm run typecheck   # ✅ 0 errors
```

추가 확인:
- StartWorkflowRunUseCase.execute 메서드가 40줄 이하인지 확인 (`wc -l`로 검증)
- WorkflowRunFactory 파일이 존재하는지 확인

게이트 통과 시 다음을 출력: `[GATE 4 PASSED] UseCase 리팩터링 완료`

---

## STEP 5: 인메모리 Adapter 구현 + 통합 테스트

### 상세 스펙: `loop-save/implement-adapters.md` 를 먼저 읽어라

### 요약
- 6개 핵심 인메모리 Repository 구현 (Git, MCP, Workflow, WorkflowRun, WorkExecution, Report)
- InMemoryEventPublisher 구현
- 3개 통합 테스트 작성 (Git 생명주기, MCP 생명주기, Workflow↔Git 캐스케이드)

### 작업

1. `loop-save/implement-adapters.md` 전체를 읽는다
2. Phase 1: 핵심 Repository 구현 (각 feature의 infra/ 디렉터리에)
   - 각 Port 인터페이스를 먼저 읽고, Map 기반 인메모리 구현체 작성
   - 파일 작성마다 `npm run typecheck`으로 인터페이스 완전 구현 확인
3. Phase 2: InMemoryEventPublisher 구현 (common/infra/)
4. Phase 3: 통합 테스트 작성 (tests/integration/)
   - 인메모리 Adapter를 직접 사용하여 Use Case → Repository → Event 흐름 검증
   - 교차 도메인 이벤트 캐스케이드 검증

### 자기 수정
- typecheck 에러 → 누락된 메서드 추가
- 통합 테스트 실패 → Repository 동작 로직 수정, 이벤트 연결 확인
- 통과할 때까지 반복

### GATE 5 — 최종 조건:
```bash
npm run test        # ✅ 전체 통과 (단위 + 통합 테스트 모두)
npm run lint        # ✅ 0 errors, 0 warnings
npm run typecheck   # ✅ 0 errors
```

추가 확인:
- `src/*/infra/` 디렉터리에 구현체 파일이 존재하는지 확인
- `tests/integration/` 디렉터리에 통합 테스트가 존재하는지 확인

게이트 통과 시 다음을 출력: `[GATE 5 PASSED] 인메모리 Adapter 및 통합 테스트 완료`

---

## 최종 완료

5개 GATE가 모두 통과되면:

1. 최종 검증을 한 번 더 실행한다:
```bash
npm run typecheck && npm run lint && npm run test
```

2. 모든 검증 통과 시 출력:

<promise>ALL IMPROVEMENTS COMPLETE</promise>
