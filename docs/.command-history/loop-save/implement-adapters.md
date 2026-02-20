# 인메모리 Adapter 구현 + 통합 테스트

## 실행 커맨드

```
/ralph-loop "loop-save/implement-adapters.md 파일을 읽고 스펙에 따라 인메모리 Adapter를 구현하고 통합 테스트를 작성하라. 완료되면 promise 태그로 ADAPTERS IMPLEMENTED를 출력하라." --completion-promise "ADAPTERS IMPLEMENTED" --max-iterations 25
```

---

## 배경

현재 프로젝트는 모든 Port(21개 인터페이스)가 정의되어 있으나 **Adapter 구현체가 하나도 없다**. 인메모리 구현체를 만들어 통합 테스트에서 실제 Use Case → Repository → Event 흐름을 검증할 수 있게 한다.

---

## 전제 조건

- 앞선 3개 루프(fix-test-infra, fix-code-quality, add-application-tests)가 모두 완료된 상태
- `npm run test` 통과, `npm run lint` 에러 0, `npm run typecheck` 통과
- 위 조건을 먼저 확인. 통과하지 않으면 중단하고 <promise>ADAPTERS BLOCKED</promise> 출력

---

## Phase 1: 핵심 인메모리 Repository 구현

가장 사용 빈도가 높은 Repository부터 구현한다.

### 구현 위치

각 feature의 `infra/` 디렉터리에 배치:

```
src/
├── git/infra/
│   └── in-memory-git-repository.ts
├── mcp/infra/
│   └── in-memory-mcp-server-repository.ts
├── workflow/infra/
│   └── in-memory-workflow-repository.ts
└── workflow-runtime/infra/
    ├── in-memory-workflow-run-repository.ts
    ├── in-memory-work-execution-repository.ts
    └── in-memory-report-repository.ts
```

### 구현 패턴 (공통)

모든 인메모리 Repository는 동일한 패턴을 따른다:

```typescript
export class InMemoryGitRepository implements GitRepository {
  private readonly store = new Map<GitId, Git>();

  async findById(id: GitId): Promise<Git | null> {
    return this.store.get(id) ?? null;
  }

  async save(git: Git): Promise<void> {
    this.store.set(git.id, git);
  }

  async delete(id: GitId): Promise<void> {
    this.store.delete(id);
  }

  async exists(id: GitId): Promise<boolean> {
    return this.store.has(id);
  }

  // ... 나머지 메서드도 Map 기반으로 구현
}
```

### 구현 순서 및 각 Repository의 특수 메서드

**1-1. InMemoryGitRepository** (GitRepository 구현)
- `findById`, `findAll`, `findByIds`, `save`, `delete`, `exists`
- `findByIds`: store에서 ids 배열로 필터

**1-2. InMemoryMcpServerRepository** (McpServerRepository 구현)
- `findById`, `findAll`, `findByIds`, `save`, `delete`, `exists`

**1-3. InMemoryWorkflowRepository** (WorkflowRepository 구현)
- 기본 CRUD + `findByGitId`, `findByMcpServerId`
- `findByGitId`: 모든 workflow를 순회하며 gitRefs에 해당 ID 포함 여부 확인
- `findByMcpServerId`: 동일 패턴

**1-4. InMemoryWorkflowRunRepository** (WorkflowRunRepository 구현)
- 기본 CRUD + `findByWorkflowId`

**1-5. InMemoryWorkExecutionRepository** (WorkExecutionRepository 구현)
- 기본 CRUD + `findByWorkflowRunId`, `findByWorkflowRunIdOrderedBySequence`, `saveAll`, `deleteByWorkflowRunId`
- `findByWorkflowRunIdOrderedBySequence`: sequence 기준 정렬

**1-6. InMemoryReportRepository** (ReportRepository 구현)
- 기본 CRUD + `findByWorkflowRunId`, `deleteByWorkflowRunId`

### 각 Repository 구현 후 검증

각 파일 작성 후:
1. `npm run typecheck` 실행 — 인터페이스의 모든 메서드가 구현되었는지 확인
2. 에러 있으면 누락된 메서드 추가

Phase 1 완료 기준:
- 6개 인메모리 Repository 파일 생성
- `npm run typecheck` 통과
- 각 feature의 index.ts barrel export에 추가

---

## Phase 2: InMemoryEventPublisher 구현

### 파일: `src/common/infra/in-memory-event-publisher.ts`

EventPublisher 인터페이스 구현:

```typescript
export class InMemoryEventPublisher implements EventPublisher {
  private readonly handlers = new Map<string, EventHandler[]>();
  private readonly publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
    const handlers = this.handlers.get(event.eventType) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, existing.filter(h => h !== handler));
  }

  // 테스트 헬퍼
  getPublishedEvents(): ReadonlyArray<DomainEvent> {
    return [...this.publishedEvents];
  }

  clear(): void {
    this.publishedEvents.length = 0;
    this.handlers.clear();
  }
}
```

Phase 2 완료 기준:
- InMemoryEventPublisher 구현
- `npm run typecheck` 통과

---

## Phase 3: 통합 테스트 작성

### 테스트 디렉터리

```
tests/integration/
├── git-lifecycle.test.ts
├── mcp-lifecycle.test.ts
└── workflow-git-cascade.test.ts
```

### 3-1. Git 생명주기 테스트

**시나리오**: Git 생성 → 삭제 → 이벤트 발행 확인

```typescript
describe('Git Lifecycle', () => {
  // Setup: InMemoryGitRepository, mock GitClient, InMemoryEventPublisher

  it('CreateGit → Git 저장 + GitCreated 이벤트', async () => {
    // CreateGitUseCase 실행
    // repository에 Git이 저장되었는지 확인
    // GitCreated 이벤트가 발행되었는지 확인
  });

  it('DeleteGit → Git 삭제 + GitDeleted 이벤트', async () => {
    // 먼저 Git 생성
    // DeleteGitUseCase 실행
    // repository에서 삭제되었는지 확인
    // GitDeleted 이벤트가 발행되었는지 확인
  });
});
```

### 3-2. MCP 서버 생명주기 테스트

**시나리오**: MCP 서버 등록 → 해제 → 이벤트 발행 확인

### 3-3. Workflow ↔ Git 캐스케이드 테스트

**시나리오**: Workflow가 Git을 참조 → Git 삭제 → Workflow에서 Git 참조 자동 제거

```typescript
describe('Workflow-Git Cascade', () => {
  // Setup: 모든 인메모리 Repository + InMemoryEventPublisher + GitDeletedHandler 연결

  it('Git 삭제 시 Workflow의 gitRef가 자동 제거된다', async () => {
    // 1. Git 생성
    // 2. Workflow 생성 (해당 Git 참조)
    // 3. EventPublisher에 GitDeletedHandler 구독
    // 4. DeleteGit 실행 → GitDeleted 이벤트 → Handler 실행
    // 5. Workflow를 다시 조회하여 gitRef가 제거되었는지 확인
  });
});
```

Phase 3 완료 기준:
- 3개 통합 테스트 파일 생성
- 각 테스트에서 인메모리 Adapter를 직접 사용
- 이벤트 기반 교차 도메인 통신이 실제로 동작하는지 검증
- `npm run test` 전체 통과

---

## Phase 4: Stub Client 구현 (optional, 시간 허용 시)

GitClient, AgentClient는 외부 시스템이므로 Stub으로 구현:

```
src/git/infra/stub-git-client.ts       — clone은 no-op, getCurrentCommit은 고정값 반환
src/agent/infra/stub-agent-client.ts   — start는 고정 processId 반환
```

---

## 완료 조건

When complete:
- 최소 6개 인메모리 Repository 구현체 존재 (각 feature의 infra/)
- InMemoryEventPublisher 구현체 존재 (common/infra/)
- 3개 이상의 통합 테스트 파일 존재 (tests/integration/)
- 통합 테스트에서 Use Case → Repository → Event 흐름이 검증됨
- 교차 도메인 이벤트 캐스케이드가 실제로 동작함 (Git 삭제 → Workflow 정리)
- `npm run test` 전체 통과
- `npm run lint` 에러/경고 0
- `npm run typecheck` 통과
- Output: <promise>ADAPTERS IMPLEMENTED</promise>

---

## 자기 수정 루프

1. Port 인터페이스 파일을 읽는다
2. 인메모리 구현체를 작성한다
3. `npm run typecheck` 실행
4. 인터페이스 미구현 에러가 있으면 누락된 메서드를 추가한다
5. 모든 typecheck 통과 후, 통합 테스트를 작성한다
6. `npm run test` 실행
7. 실패 시:
   a. Repository 동작 오류 → Map 조작 로직 수정
   b. 이벤트 연결 오류 → EventPublisher의 subscribe/publish 흐름 확인
   c. import 경로 오류 → 수정
8. 통과할 때까지 6-7 반복
9. `npm run lint` 확인 → 경고/에러 수정
10. 전체 통과 시 barrel export(index.ts) 업데이트
