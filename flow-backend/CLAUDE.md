# CLAUDE.md — workflow-backend 아키텍처 규칙

## 프로젝트 개요

워크플로우 실행 관리 백엔드. TypeScript + DDD + Hexagonal Architecture + Vertical Slice 구조.

- **언어:** TypeScript 5.9 (strict mode, ES2022, ESM)
- **테스트:** Vitest
- **프레임워크:** NestJS (presentation/infra 레이어), TypeORM (영속화)
- **외부 런타임 의존성:** @anthropic-ai/claude-agent-sdk, @nestjs/common, @nestjs/core, @nestjs/platform-express, @nestjs/typeorm, class-transformer, class-validator, pg, reflect-metadata, rxjs, typeorm, uuid

## 빌드 & 검증 커맨드

```bash
npm run typecheck   # tsc --noEmit (타입 체크)
npm run test        # vitest run (단위 테스트)
npm run lint        # eslint src tests
npm run lint:fix    # eslint --fix
npm run format      # prettier --write
npm run build       # tsc (빌드)
```

코드 변경 후 반드시 `npm run typecheck`로 타입 체크를 통과시켜야 한다.

## 디렉토리 구조 (Vertical Slice + CQRS)

```
src/
├── common/                  # 도메인 간 공유 패키지
│   ├── aggregate-root.ts    # AggregateRoot<TId> 베이스 클래스
│   ├── events/              # 도메인 이벤트 인터페이스 및 구체 이벤트
│   ├── ids/                 # Branded ID 타입 (WorkflowId, GitId, McpServerId 등)
│   ├── ports/               # 공유 포트 인터페이스 (EventPublisher 등)
│   ├── value-objects/       # 도메인 간 공유 VO
│   └── errors/              # DomainError, ApplicationError 베이스 클래스
│
├── {feature}/               # 각 도메인 feature (workflow, git, mcp, agent, workflow-runtime)
│   ├── domain/
│   │   ├── entities/        # Aggregate Root 및 엔티티
│   │   ├── value-objects/   # 도메인 전용 VO
│   │   ├── ports/           # Repository, Service 인터페이스
│   │   └── errors/          # 도메인 전용 에러
│   ├── application/
│   │   ├── commands/        # Command Use Case (상태 변경)
│   │   ├── queries/         # Query Use Case (읽기 전용)
│   │   ├── event-handlers/  # 도메인 이벤트 핸들러
│   │   └── factories/       # 도메인 객체 생성 팩토리
│   ├── infra/               # 인프라 어댑터 구현체 (Repository, Query Adapter 등)
│   └── presentation/        # API/Controller, NestJS Module (Composition Root)
```

**Bounded Contexts:** workflow, workflow-runtime, git, mcp, agent

## 핵심 아키텍처 규칙

### 1. 도메인 간 직접 import 금지

도메인 간에는 직접 import하지 않는다. 반드시 아래 방법으로만 상호작용한다:

- **이벤트:** `@common/events`에 정의된 도메인 이벤트를 통한 비동기 통신
- **공유 ID:** `@common/ids`에서 import
- **공유 VO:** `@common/value-objects`에서 import
- **Query 어댑터:** `@common/ports`에 포트를 정의하고, 데이터를 소유한 도메인의 `infra/`에서 구현 (→ 규칙 10 참고)

```typescript
// GOOD
import { GitId } from '@common/ids/shared-ids.js';
import { GitDeleted } from '@common/events/git-events.js';

// BAD — 다른 도메인 직접 참조
import { Workflow } from '@workflow/domain/entities/workflow.js';
```

### 2. Path Alias 규칙

tsconfig.json에 정의된 alias만 사용한다:

| Alias | 경로 |
|---|---|
| `@common/*` | `src/common/*` |
| `@workflow/*` | `src/workflow/*` |
| `@workflow-runtime/*` | `src/workflow-runtime/*` |
| `@git/*` | `src/git/*` |
| `@mcp/*` | `src/mcp/*` |
| `@agent/*` | `src/agent/*` |

import 경로에는 반드시 `.js` 확장자를 붙인다 (ESM 요구사항).

### 3. 엔티티 작성 패턴

모든 Aggregate Root는 `AggregateRoot<TId>`를 상속한다.

```typescript
export class MyEntity extends AggregateRoot<MyEntityId> {
  // private 필드, readonly
  private readonly _id: MyEntityId;
  private _name: string;

  // private constructor
  private constructor(props: MyEntityProps) { ... }

  // 생성 팩토리 — 불변식 검증 + 도메인 이벤트 발행
  static create(props: CreateProps): MyEntity { ... }

  // 복원 팩토리 — 영속성에서 로드, 이벤트 발행 안 함
  static fromProps(props: MyEntityProps): MyEntity { ... }

  // getter로만 외부 접근
  get id(): MyEntityId { return this._id; }
}
```

### 4. Value Object 패턴

Branded Type + 팩토리 객체로 타입 안전성을 보장한다.

```typescript
export type IssueKey = Brand<string, 'IssueKey'>;

export const IssueKey = {
  create(value: string): IssueKey {
    // 유효성 검증
    return value as IssueKey;
  },
  isValid(value: unknown): value is IssueKey {
    // 타입 가드
  },
};
```

ID는 `@common/ids`의 `createIdFactory<T>()` 유틸리티로 생성한다.

### 5. CQRS — Command / Query 분리

Use Case는 **Command**(상태 변경)와 **Query**(읽기 전용)로 엄격히 구분한다.

#### 5-1. Command Use Case (상태 변경)

위치: `{feature}/application/commands/`

```typescript
@Injectable()
export class CreateWorkflowUseCase {
  constructor(
    private readonly repository: WorkflowRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateWorkflowCommand): Promise<CreateWorkflowResult> {
    // 1. 외부 참조 검증
    // 2. 도메인 엔티티 생성/수정
    // 3. Repository에 저장
    // 4. 도메인 이벤트 발행
    // 5. 결과 반환
  }
}
```

- 반드시 상태를 변경한다 (Create, Update, Delete, 상태 전이 등)
- 도메인 이벤트를 발행한다
- 네이밍: `{동사}{엔티티}UseCase` (예: `CreateWorkflowUseCase`, `DeleteGitUseCase`)

#### 5-2. Query Use Case (읽기 전용)

위치: `{feature}/application/queries/`

```typescript
@Injectable()
export class GetWorkflowQuery {
  constructor(
    private readonly repository: WorkflowRepository,
  ) {}

  async execute(query: GetWorkflowParams): Promise<WorkflowReadModel> {
    // 1. Repository에서 조회
    // 2. 읽기 전용 모델로 변환
    // 3. 결과 반환 (이벤트 발행 없음)
  }
}
```

- 상태를 **절대 변경하지 않는다** — Repository 읽기, 데이터 매핑만 수행
- 도메인 이벤트를 발행하지 않는다
- `EventPublisher`를 주입받지 않는다
- 네이밍: `Get{엔티티}Query`, `List{엔티티}Query`, `Search{엔티티}Query`
- Controller에서 직접 Repository를 호출하지 않고, 반드시 Query Use Case를 통해 조회한다

#### 5-3. 도메인 간 커맨드 호출 및 fire-and-forget 규칙

**도메인 간 커맨드 호출:** `@common/ports/`에 Service 포트를 정의하고 `await`로 호출한다.

```typescript
// @common/ports/ 에 추상 클래스로 포트 정의
export abstract class AgentService {
  abstract startSession(options: StartOptions): Promise<AgentSessionInfo>;
  abstract sendQuery(weId: WorkExecutionId, query: string): Promise<QueryResult>;
}

// UseCase에서 외부 서비스처럼 await
const result = await this.agentService.sendQuery(weId, query);
```

**fire-and-forget (`void`) 규칙:**
- `void`는 **presentation 계층(컨트롤러, Module.onModuleInit)에서만** 허용
- application 계층(UseCase, Service 구현체)에서는 반드시 `await`로 처리
- 장시간 실행되는 파이프라인은 Service 포트로 정의하고, presentation 계층에서 `void service.run()`으로 시작

**이벤트 역할:**
- 도메인 이벤트는 **상태 변경 알림**(notification)에 사용 — cross-domain 반응, 로깅, 프론트엔드 SSE 등
- 파이프라인 진행(orchestration)에는 사용하지 않는다 — Service 내부 루프로 처리

NestJS DI가 생성자 파라미터를 개별 해석하므로, 의존성은 생성자에 직접 나열한다.

### 6. 에러 처리 계층

```
DomainError (code, message, isTransient)     ← 도메인 불변식 위반
├── {Feature}InvariantViolationError         ← 엔티티 불변식
├── {Feature}InvalidStateTransitionError     ← 상태 전이 위반
└── 기타 도메인 에러 (isTransient: true면 재시도 가능)

ApplicationError (code, message)             ← 유스케이스 레벨 에러
├── {Feature}NotFoundError
├── {Feature}CreationError
└── 기타 애플리케이션 에러
```

- 도메인 에러는 `@common/errors`의 `DomainError`를 상속
- 애플리케이션 에러는 `@common/errors`의 `ApplicationError`를 상속
- Use Case에서 알 수 없는 에러는 ApplicationError로 래핑

### 7. 도메인 이벤트 규칙

```typescript
export class SomeEvent extends BaseDomainEvent {
  static readonly EVENT_TYPE = 'feature.action_past_tense';  // 예: 'git.deleted'
  readonly payload: Readonly<SomeEventPayload>;

  constructor(payload: SomeEventPayload, correlationId?: string) {
    super(SomeEvent.EVENT_TYPE, correlationId);
    this.payload = Object.freeze({ ...payload });
  }
}
```

- 이벤트 타입: `{도메인}.{과거형동사}` 형식 (예: `workflow.created`, `git.deleted`)
- 페이로드는 반드시 `Object.freeze()`로 불변 처리
- 새 이벤트는 `@common/events/`에 정의
- 엔티티에서 `addDomainEvent()`로 축적, Use Case에서 `clearDomainEvents()` 후 `eventPublisher.publishAll()`로 발행

### 8. 불변성 규칙

- 엔티티 필드는 `private readonly` (변경 가능한 필드는 `private`만)
- 컬렉션은 `Object.freeze()`로 동결
- getter는 원본 대신 복사본 반환: `return [...this._items]`
- 이벤트 페이로드는 `Object.freeze({ ...payload })`

### 9. 의존성 주입

- 의존성은 반드시 포트(인터페이스)로 정의
- 구체 구현은 infra 레이어에서 제공
- NestJS Module(`*.module.ts`)이 Composition Root 역할 — 포트와 어댑터를 조립
- **도메인 레이어**에는 NestJS 데코레이터를 사용하지 않는다 — 순수 TypeScript 유지
- **애플리케이션 레이어**(Use Case, Event Handler, Factory)에는 `@Injectable()`을 허용한다 — NestJS DI 자동 해석을 위해 사용

### 10. 도메인 간 포트 공유 (Module Export)

도메인 간 데이터 조회가 필요할 때, **Query Adapter 포트**를 통해 공유한다:

1. `@common/ports/`에 추상 클래스로 포트를 정의 (예: `GitReferenceChecker`, `WorkflowConfigReader`)
2. 해당 데이터를 소유한 feature의 `infra/`에서 구현체를 작성
3. 해당 feature의 `*.module.ts`에서 구현체를 등록하고, 포트 토큰을 `exports`에 추가
4. 사용하는 쪽의 `*.module.ts`에서 해당 모듈을 `imports`에 추가

```typescript
// git.module.ts — 포트 제공 측
@Module({
  providers: [
    {
      provide: GitReferenceChecker,
      useFactory: (repo: GitRepository) => new GitReferenceCheckerImpl(repo),
      inject: [GitRepository],
    },
  ],
  exports: [GitReferenceChecker],  // 포트 토큰을 export
})
export class GitModule {}

// workflow.module.ts — 포트 소비 측
@Module({
  imports: [GitModule],  // GitReferenceChecker를 DI에서 사용 가능
  providers: [CreateWorkflowUseCase],
})
export class WorkflowModule {}
```

현재 모듈 의존 관계:

```
SharedModule (@Global: EventPublisher)
    ↑
GitModule        → exports [GitReferenceChecker]
McpModule        → exports [McpServerReferenceChecker, McpServerReader]
    ↑
WorkflowModule   (imports Git, Mcp) → exports [WorkflowConfigReader]
    ↑
WorkflowRuntimeModule (imports Workflow, Mcp)
```

### 11. 네이밍 컨벤션

| 패턴 | 접미사 | 예시 |
|---|---|---|
| Aggregate Root / Entity | - | `Workflow`, `Git`, `McpServer` |
| Value Object | - | `IssueKey`, `GitUrl`, `BranchStrategy` |
| Repository Port | `Repository` | `WorkflowRepository`, `GitRepository` |
| External Service Port | `Service` / `Client` | `GitService`, `AgentClient` |
| Query Adapter Port | `Reader` / `ReferenceChecker` | `WorkflowConfigReader`, `GitReferenceChecker` |
| Command Use Case | `UseCase` | `CreateWorkflowUseCase`, `DeleteGitUseCase` |
| Query Use Case | `Query` | `GetWorkflowQuery`, `ListGitQuery` |
| Event Handler | `Handler` | `GitDeletedHandler` |
| Domain Error | `Error` | `GitInvariantViolationError` |
| Domain Event | 과거형 | `WorkflowCreated`, `GitDeleted` |

### 12. 테스트 규칙

- 테스트 위치:
  - 도메인 단위: `tests/unit/domain/{feature}/{Entity}.test.ts`
  - 애플리케이션 단위: `tests/unit/application/{feature}/{UseCase}.test.ts`
  - 인프라 단위: `tests/unit/infra/{feature}/{Adapter}.test.ts`
  - 통합: `tests/integration/{scenario}.test.ts`
  - E2E: `tests/e2e/{scenario}.e2e.test.ts`
- 필수 테스트 항목:
  - 엔티티 생성 (정상 케이스)
  - 불변식 위반 시 에러 발생
  - 상태 전이 (정상/비정상)
  - 도메인 이벤트 발행 여부
  - Use Case 정상/실패 시나리오
- Vitest global mode 사용 (`describe`, `it`, `expect` import 불필요)

### 13. 상태 머신

상태를 가진 엔티티는 명시적 상태 전이를 강제한다:

```typescript
start(): void {
  if (this._status !== Status.INITIALIZED) {
    throw new InvalidStateTransitionError(this._status, Status.RUNNING);
  }
  this._status = Status.RUNNING;
  this.addDomainEvent(new Started(...));
}
```

허용되지 않은 상태 전이는 `InvalidStateTransitionError`로 거부한다.

## 금지 사항

- 도메인 레이어에서 인프라/외부 라이브러리 직접 사용 금지 (uuid는 예외)
- `any` 타입 사용 금지 — `unknown` 사용 후 타입 가드로 좁히기
- 도메인 간 직접 import 금지 — 반드시 `@common/`을 통해 상호작용
- 가변(mutable) public 필드 금지 — getter만 노출
- 도메인 레이어에서 NestJS 데코레이터 사용 금지 — 순수 TypeScript 유지
- 에이전트 SDK에서 API 키 인증 사용 금지 — `claude` CLI의 OAuth 인증만 사용
