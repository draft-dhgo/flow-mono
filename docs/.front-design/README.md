# Workflow Backend — React 웹 클라이언트 설계 문서

## 1. 기술 스택

| 범주 | 선택 | 이유 |
|------|------|------|
| UI 프레임워크 | **React 18** + TypeScript 5 | 백엔드와 동일한 TS 생태계, 컴포넌트 기반 |
| 빌드 도구 | **Vite** | 빠른 HMR, ESM 네이티브 지원 |
| 라우팅 | **React Router v6** | 표준 SPA 라우팅, 중첩 라우트 지원 |
| 상태 관리 | **TanStack Query (React Query)** | 서버 상태 캐싱/동기화, 폴링 지원 내장 |
| 폼 관리 | **React Hook Form** + **Zod** | 복잡한 중첩 폼(WorkDefinition) 처리에 최적 |
| UI 컴포넌트 | **shadcn/ui** + **Tailwind CSS** | 커스터마이즈 가능, 번들 크기 최소화 |
| HTTP 클라이언트 | **Axios** | 인터셉터 기반 에러 핸들링, 타입 안전 |
| 아이콘 | **Lucide React** | shadcn/ui와 통합, 트리 셰이킹 |
| 마크다운 렌더링 | **react-markdown** | 에이전트 응답 렌더링용 |

## 2. 디렉토리 구조

```
src/
├── api/                          # API 클라이언트 레이어
│   ├── client.ts                 # Axios 인스턴스 설정
│   ├── types.ts                  # 공유 타입 (→ apis/ 문서 기반)
│   ├── workflows.ts              # Workflow API 함수 (→ apis/workflow.md)
│   ├── gits.ts                   # Git API 함수 (→ apis/git.md)
│   ├── mcp-servers.ts            # MCP Server API 함수 (→ apis/mcp-server.md)
│   ├── workflow-runs.ts          # Workflow Run API 함수 (→ apis/workflow-run.md)
│   └── agent-sessions.ts         # Agent Session API 함수 (→ apis/agent-session.md)
│
├── components/                   # 공통 컴포넌트
│   ├── ui/                       # shadcn/ui 기본 컴포넌트
│   ├── layout/
│   │   ├── AppLayout.tsx         # 전체 레이아웃 (Sidebar + Content)
│   │   ├── Sidebar.tsx           # 네비게이션 사이드바
│   │   └── PageHeader.tsx        # 페이지 헤더 (타이틀, 액션 버튼)
│   ├── StatusBadge.tsx           # 상태 뱃지 (RUNNING, PAUSED, etc.)
│   ├── ConfirmDialog.tsx         # 삭제/취소 확인 다이얼로그
│   ├── DataTable.tsx             # 정렬/필터 가능한 데이터 테이블
│   ├── EmptyState.tsx            # 데이터 없을 때 안내 UI
│   ├── ErrorAlert.tsx            # API 에러 표시
│   └── LoadingSpinner.tsx        # 로딩 인디케이터
│
├── hooks/                        # 커스텀 훅
│   ├── useWorkflows.ts           # Workflow CRUD 쿼리/뮤테이션
│   ├── useGits.ts                # Git CRUD 쿼리/뮤테이션
│   ├── useMcpServers.ts          # MCP Server CRUD 쿼리/뮤테이션
│   ├── useWorkflowRuns.ts        # Workflow Run 쿼리/액션
│   └── useAgentSession.ts        # Agent Session 쿼리/액션
│
├── pages/                        # 페이지 컴포넌트
│   ├── DashboardPage.tsx
│   ├── WorkflowListPage.tsx
│   ├── WorkflowFormPage.tsx      # 생성/수정 공용
│   ├── GitManagementPage.tsx
│   ├── McpServerManagementPage.tsx
│   ├── WorkflowRunDetailPage.tsx
│   └── AgentSessionPage.tsx
│
├── lib/                          # 유틸리티
│   ├── constants.ts              # 상수 정의
│   └── format.ts                 # 날짜/상태 포맷 유틸
│
├── App.tsx                       # 라우터 설정
├── main.tsx                      # 엔트리포인트
└── index.css                     # Tailwind 설정
```

## 3. 라우팅 설계

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | DashboardPage | 대시보드 (실행 현황) |
| `/workflows` | WorkflowListPage | 워크플로우 목록 |
| `/workflows/new` | WorkflowFormPage | 워크플로우 생성 |
| `/workflows/:id/edit` | WorkflowFormPage | 워크플로우 수정 |
| `/gits` | GitManagementPage | Git 저장소 관리 |
| `/mcp-servers` | McpServerManagementPage | MCP 서버 관리 |
| `/workflow-runs/:id` | WorkflowRunDetailPage | 실행 상세 |
| `/workflow-runs/:id/agent` | AgentSessionPage | 에이전트 세션 |

## 4. 설계 문서 구조

이 프로젝트의 프론트엔드 설계는 **페이지 설계**와 **API 스펙** 두 계층으로 구성된다.

### 4.1 페이지 설계 (`pages/`)

각 페이지의 UI 구조, 컴포넌트 트리, 상태 관리, 인터랙션 흐름을 정의한다.

| 페이지 | 설계 문서 | 역할 |
|--------|-----------|------|
| Dashboard | [pages/dashboard.md](pages/dashboard.md) | 실행 현황 요약, 최근 실행 목록 |
| Workflow 관리 | [pages/workflow-management.md](pages/workflow-management.md) | 워크플로우 CRUD, 중첩 폼 |
| Git 관리 | [pages/git-management.md](pages/git-management.md) | Git 저장소 등록/삭제 |
| MCP Server 관리 | [pages/mcp-server-management.md](pages/mcp-server-management.md) | MCP 서버 등록/해제 |
| 실행 상세 | [pages/workflow-run.md](pages/workflow-run.md) | 실행 진행 상황, 액션, Work Node 편집 |
| 에이전트 세션 | [pages/agent-session.md](pages/agent-session.md) | 에이전트 채팅 인터랙션 |

### 4.2 API 스펙 (`apis/`)

각 백엔드 도메인의 API 엔드포인트 상세 스펙을 정의한다. 요청/응답 스키마, 상태 코드, 에러 코드, validation 규칙을 포함한다.

| 도메인 | API 스펙 | 엔드포인트 수 |
|--------|----------|--------------|
| Git | [apis/git.md](apis/git.md) | 2 구현 + 2 미구현 |
| MCP Server | [apis/mcp-server.md](apis/mcp-server.md) | 2 구현 + 2 미구현 |
| Workflow | [apis/workflow.md](apis/workflow.md) | 5 구현 + 2 미구현 |
| Workflow Run | [apis/workflow-run.md](apis/workflow-run.md) | 10 구현 + 4 미구현 |
| Agent Session | [apis/agent-session.md](apis/agent-session.md) | 3 구현 + 1 미구현 |

### 4.3 페이지 ↔ API 매핑

각 페이지가 호출하는 API와 해당 스펙 문서의 참조 관계:

| 페이지 | 사용 API 스펙 | 주요 호출 엔드포인트 |
|--------|--------------|---------------------|
| Dashboard | [workflow-run](apis/workflow-run.md), [workflow](apis/workflow.md) | `GET /workflow-runs/summary`, `GET /workflow-runs`, `POST pause/resume/cancel` |
| Workflow 관리 | [workflow](apis/workflow.md), [git](apis/git.md), [mcp-server](apis/mcp-server.md) | `POST/PUT/DELETE /workflows`, `POST activate/deactivate`, `GET /gits`, `GET /mcp-servers` |
| Git 관리 | [git](apis/git.md), [workflow](apis/workflow.md) | `POST /gits`, `DELETE /gits/:id`, `GET /workflows` (참조 확인) |
| MCP Server 관리 | [mcp-server](apis/mcp-server.md), [workflow](apis/workflow.md) | `POST /mcp-servers`, `DELETE /mcp-servers/:id`, `GET /workflows` (참조 확인) |
| 실행 상세 | [workflow-run](apis/workflow-run.md) | `GET /workflow-runs/:id`, `GET checkpoints`, `POST pause/resume/cancel`, `PUT/POST/DELETE work-nodes` |
| 에이전트 세션 | [agent-session](apis/agent-session.md), [workflow-run](apis/workflow-run.md) | `GET /workflow-runs/:id` (ID 해석), `POST queries`, `DELETE` session |

### 4.4 구현 순서 가이드

프론트엔드 구현 시 권장 순서:

1. **API 클라이언트 레이어** — `apis/` 문서 기반으로 `api/types.ts`, `api/*.ts` 구현
2. **공통 컴포넌트** — `StatusBadge`, `DataTable`, `ConfirmDialog` 등
3. **Git/MCP 관리 페이지** — 단순 CRUD, 독립적
4. **Workflow 관리 페이지** — 중첩 폼, Git/MCP 의존
5. **Dashboard** — 목록 조회 + 액션
6. **실행 상세 페이지** — 복합 상태 관리, 폴링, Work Node CRUD
7. **에이전트 세션 페이지** — ID 해석 체인, 채팅 UI

## 5. API 클라이언트 레이어

### 5.1 Axios 인스턴스 (`api/client.ts`)

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 응답 인터셉터: 에러 정규화
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const apiError: ApiError = {
      code: error.response?.data?.code || 'UNKNOWN',
      message: error.response?.data?.message || error.message,
      status: error.response?.status || 500,
    };
    return Promise.reject(apiError);
  },
);
```

### 5.2 API 함수 구현 가이드

각 `api/*.ts` 파일은 대응하는 `apis/*.md` 스펙을 기반으로 구현한다:

```typescript
// 예시: api/gits.ts (→ apis/git.md 참조)
export const gitsApi = {
  list: () => apiClient.get<GitResponse[]>('/gits'),
  create: (data: CreateGitRequest) => apiClient.post<GitResponse>('/gits', data),
  delete: (id: string) => apiClient.delete(`/gits/${id}`),
};
```

요청/응답 타입은 API 스펙 문서의 TypeScript 인터페이스를 `api/types.ts`에 그대로 선언한다.

### 5.3 에러 처리 전략

```typescript
interface ApiError {
  code: string;    // 백엔드 에러 코드 (예: 'GIT_REFERENCED_BY_WORKFLOW')
  message: string; // 사용자 표시 가능 메시지
  status: number;  // HTTP 상태 코드
}
```

| 에러 유형 | 처리 방법 |
|-----------|-----------|
| `DomainError` (400) | 사용자에게 의미 있는 메시지 표시 |
| `ApplicationError` (404 등) | 토스트 알림 |
| 참조 차단 에러 (`*_REFERENCED_BY_WORKFLOW`) | 차단 다이얼로그 표시 |
| 상태 전이 에러 (`*_INVALID_STATE_TRANSITION`) | 상태 새로고침 + 토스트 |
| 네트워크 에러 | 연결 실패 배너 |

에러 코드별 처리 방법은 각 API 스펙 문서의 "에러" 섹션을 참조한다.

## 6. 전역 상태 관리 전략

**원칙:** 서버 상태는 TanStack Query, 클라이언트 상태는 React Context/useState.

| 상태 종류 | 관리 방법 |
|-----------|-----------|
| 서버 데이터 (목록, 상세) | TanStack Query `useQuery` + 캐시 |
| 뮤테이션 (생성/수정/삭제) | TanStack Query `useMutation` + 캐시 무효화 |
| 실행 중 상태 폴링 | TanStack Query `refetchInterval` (3초, RUNNING일 때만) |
| UI 상태 (사이드바 열림, 모달) | React useState / Context |
| 폼 상태 | React Hook Form |

**캐시 키 설계:**

```typescript
const queryKeys = {
  workflows: {
    all: ['workflows'] as const,
    detail: (id: string) => ['workflows', id] as const,
  },
  gits: {
    all: ['gits'] as const,
  },
  mcpServers: {
    all: ['mcp-servers'] as const,
  },
  workflowRuns: {
    all: ['workflow-runs'] as const,
    detail: (id: string) => ['workflow-runs', id] as const,
    summary: ['workflow-runs', 'summary'] as const,
  },
  agentSessions: {
    detail: (workExecutionId: string) => ['agent-sessions', workExecutionId] as const,
  },
};
```

## 7. 공통 컴포넌트 목록

| 컴포넌트 | 역할 |
|----------|------|
| `AppLayout` | Sidebar + 메인 콘텐츠 영역 2단 레이아웃 |
| `Sidebar` | 네비게이션 링크 (Dashboard, Workflows, Git, MCP Servers) |
| `PageHeader` | 페이지 타이틀 + 우측 액션 버튼 영역 |
| `StatusBadge` | WorkflowRun/Task 상태를 색상 뱃지로 표시 |
| `ConfirmDialog` | 삭제/취소 등 위험 액션 확인 모달 |
| `DataTable` | 목록 표시 테이블 (정렬, 빈 상태 처리) |
| `EmptyState` | 데이터 없을 때 안내 + CTA 버튼 |
| `ErrorAlert` | API 에러 메시지 표시 |
| `LoadingSpinner` | 데이터 로딩 중 인디케이터 |

## 8. 공유 타입 정의

여러 페이지에서 공통으로 사용하는 타입. 도메인별 요청/응답 타입은 각 [API 스펙 문서](apis/)를 참조한다.

```typescript
// ─── 열거형 ───

type WorkflowStatus = 'DRAFT' | 'ACTIVE';

type WorkflowRunStatus =
  | 'INITIALIZED'
  | 'RUNNING'
  | 'PAUSED'
  | 'AWAITING'
  | 'COMPLETED'
  | 'CANCELLED';

type McpTransportType = 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';

// ─── 에러 ───

interface ApiError {
  code: string;
  message: string;
  status: number;
}

// ─── 대시보드 요약 ───

interface RunSummary {
  running: number;
  paused: number;
  awaiting: number;
  completed: number;
  cancelled: number;
  initialized: number;
}
```

## 9. 미구현 API 요약

아래 엔드포인트는 프론트엔드 구현을 위해 백엔드에 추가해야 한다. 상세 응답 타입은 각 API 스펙 문서를 참조한다.

### 필수

| Method | Endpoint | API 스펙 | 필요 페이지 |
|--------|----------|----------|------------|
| `GET` | `/gits` | [apis/git.md](apis/git.md) | Git 관리, Workflow 폼 |
| `GET` | `/gits/:id` | [apis/git.md](apis/git.md) | Workflow 수정 폼 |
| `GET` | `/mcp-servers` | [apis/mcp-server.md](apis/mcp-server.md) | MCP 관리, Workflow 폼 |
| `GET` | `/mcp-servers/:id` | [apis/mcp-server.md](apis/mcp-server.md) | Workflow 수정 폼 |
| `GET` | `/workflows` | [apis/workflow.md](apis/workflow.md) | Workflow 관리, 삭제 참조 확인 |
| `GET` | `/workflows/:id` | [apis/workflow.md](apis/workflow.md) | Workflow 수정 폼 |
| `GET` | `/workflow-runs` | [apis/workflow-run.md](apis/workflow-run.md) | Dashboard 목록 |
| `GET` | `/agent-sessions/:workExecutionId` | [apis/agent-session.md](apis/agent-session.md) | 에이전트 세션 |

### 필수 (기존 API 응답 확장)

| Endpoint | 추가 필드 | API 스펙 |
|----------|-----------|----------|
| `GET /workflow-runs/:id` | `workExecutionIds`, `workNodeConfigs` | [apis/workflow-run.md](apis/workflow-run.md) |

### 선택

| Method | Endpoint | API 스펙 | 필요 페이지 |
|--------|----------|----------|------------|
| `GET` | `/workflow-runs/summary` | [apis/workflow-run.md](apis/workflow-run.md) | Dashboard 요약 카드 |
| `GET` | `/workflow-runs/:id/reports` | [apis/workflow-run.md](apis/workflow-run.md) | 실행 상세 리포트 |
| `GET` | `/reports/:id` | [apis/workflow-run.md](apis/workflow-run.md) | 리포트 뷰어 |
