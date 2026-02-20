# Application 레이어 테스트 추가

## 실행 커맨드

```
/ralph-loop "loop-save/add-application-tests.md 파일을 읽고 스펙에 따라 Application 레이어 테스트를 추가하라. 완료되면 promise 태그로 APPLICATION TESTS COMPLETE를 출력하라." --completion-promise "APPLICATION TESTS COMPLETE" --max-iterations 20
```

---

## 배경

현재 테스트는 domain 엔티티 단위 테스트(6개 파일)만 존재한다. Use Case와 Event Handler에 대한 테스트가 전무하여 application 레이어의 오케스트레이션 로직이 검증되지 않는다.

---

## 전제 조건

- `loop-save/fix-test-infra.md`가 먼저 완료되어 기존 6개 테스트가 통과하는 상태여야 한다
- `loop-save/fix-code-quality.md`가 먼저 완료되어 lint error가 0인 상태여야 한다
- 먼저 `npm run test`를 실행하여 기존 테스트가 통과하는지 확인. 통과하지 않으면 중단하고 <promise>APPLICATION TESTS BLOCKED</promise> 출력

---

## 테스트 전략

### Mock 방식

모든 Port(Repository, Client, EventPublisher)는 **인라인 mock 객체**로 구현한다.
vitest의 `vi.fn()`을 사용한다.

```typescript
// 표준 mock 패턴 예시
const mockRepository = {
  save: vi.fn(),
  findById: vi.fn(),
} satisfies GitRepository;

const mockEventPublisher = {
  publish: vi.fn(),
  publishAll: vi.fn(),
} satisfies EventPublisher;
```

### 테스트 디렉터리 구조

```
tests/unit/application/
├── git/
│   ├── create-git-use-case.test.ts
│   └── delete-git-use-case.test.ts
├── mcp/
│   ├── register-mcp-server-use-case.test.ts
│   └── unregister-mcp-server-use-case.test.ts
├── workflow/
│   ├── create-workflow-use-case.test.ts
│   └── event-handlers/
│       ├── git-deleted-handler.test.ts
│       └── mcp-server-unregistered-handler.test.ts
└── workflow-runtime/
    ├── start-workflow-run-use-case.test.ts
    ├── cancel-workflow-run-use-case.test.ts
    └── event-handlers/
        └── work-execution-completed-handler.test.ts
```

---

## Phase 1: 간단한 Use Case부터 (Git, MCP)

### 1-1. CreateGitUseCase 테스트

먼저 `src/git/application/use-cases/create-git-use-case.ts`를 읽고 테스트를 작성.

검증 포인트:
- 정상 생성 시: gitClient.clone 호출됨, gitRepository.save 호출됨, eventPublisher.publishAll 호출됨, 결과에 gitId/url/localPath 포함
- clone 실패 시: GitCloneError가 throw됨
- 반환값의 타입과 값이 올바른지

### 1-2. DeleteGitUseCase 테스트

먼저 `src/git/application/use-cases/delete-git-use-case.ts`를 읽고 테스트를 작성.

검증 포인트:
- 정상 삭제 시: repository.delete 호출됨, eventPublisher.publishAll 호출됨
- 존재하지 않는 Git ID: 적절한 에러 throw

### 1-3. RegisterMcpServerUseCase, UnregisterMcpServerUseCase 테스트

각각 소스를 먼저 읽고 동일한 패턴으로 작성.

Phase 1 완료 기준:
- 4개 Use Case 테스트 파일 생성
- `npm run test` 실행 시 새 테스트 포함 전체 통과

---

## Phase 2: Workflow Use Case 테스트

### 2-1. CreateWorkflowUseCase 테스트

먼저 `src/workflow/application/use-cases/create-workflow-use-case.ts`를 읽고 테스트 작성.

검증 포인트:
- 정상 생성: workflow가 repository에 저장됨, 이벤트 발행됨
- Git/MCP 참조 검증 실패 시: 적절한 에러

### 2-2. Event Handler 테스트

#### GitDeletedHandler 테스트

검증 포인트:
- Git이 참조된 workflow를 찾아서 gitRef를 제거한다
- 변경된 workflow를 저장하고 이벤트를 발행한다
- 참조된 workflow가 없으면 아무 동작 안 함

#### McpServerUnregisteredHandler 테스트

검증 포인트:
- 동일한 패턴: MCP 참조 제거, 저장, 이벤트 발행

Phase 2 완료 기준:
- 3개 테스트 파일 추가 (CreateWorkflow + 2 handlers)
- `npm run test` 전체 통과

---

## Phase 3: Workflow-Runtime Use Case 테스트

### 3-1. CancelWorkflowRunUseCase 테스트

가장 단순한 런타임 use case부터 시작.

검증 포인트:
- RUNNING 상태의 run을 cancel: 상태 변경, 저장, 이벤트 발행
- 이미 COMPLETED인 run을 cancel: 에러 throw
- 존재하지 않는 run: 에러 throw

### 3-2. StartWorkflowRunUseCase 테스트

가장 복잡한 use case.

검증 포인트:
- 정상 시작: WorkflowRun, WorkExecution, Report 생성 및 저장
- 존재하지 않는 workflow: WorkflowNotFoundError
- 이벤트가 올바르게 수집/발행되는지

### 3-3. WorkExecutionCompletedHandler 테스트

검증 포인트:
- 이벤트 수신 시 StartNextWorkExecutionUseCase.execute가 호출됨
- workflowRunId가 올바르게 전달됨

Phase 3 완료 기준:
- 3개 테스트 파일 추가
- `npm run test` 전체 통과

---

## 완료 조건

When complete:
- 최소 10개 이상의 새 테스트 파일 생성
- 모든 Use Case에 대해 정상/에러 케이스 테스트 존재
- 핵심 Event Handler(GitDeletedHandler, WorkExecutionCompletedHandler)에 테스트 존재
- `npm run test` 전체 통과 (기존 6개 + 신규 모두)
- `npm run lint` 에러 없음
- Output: <promise>APPLICATION TESTS COMPLETE</promise>

---

## 자기 수정 루프

각 Phase 내에서:
1. 대상 소스 파일을 **먼저 읽는다** (Use Case 또는 Event Handler)
2. 의존하는 Port/Repository 인터페이스를 확인한다
3. mock 객체를 작성한다
4. 테스트 케이스를 작성한다 (정상 케이스 먼저, 에러 케이스 후)
5. `npm run test` 실행
6. 실패하면:
   a. import 경로 오류 → 경로 수정
   b. mock 불일치 → 소스의 실제 시그니처와 비교하여 수정
   c. assertion 실패 → 소스 로직을 다시 읽고 기대값 수정
7. 통과할 때까지 5-6 반복
8. 다음 테스트로 이동
