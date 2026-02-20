# CLAUDE.md — flow-front 아키텍처 규칙

## 프로젝트 개요

워크플로우 관리 대시보드 프론트엔드. React + TypeScript + Vite + TanStack Query 구조.

- **언어:** TypeScript 5.9 (strict mode, ES2022)
- **프레임워크:** React 19, React Router DOM 7
- **빌드:** Vite 7
- **서버 상태:** TanStack React Query 5
- **폼:** React Hook Form 7 + Zod 4
- **스타일:** Tailwind CSS 4 + shadcn/ui (Radix UI)
- **HTTP:** Axios
- **아이콘:** lucide-react

## 빌드 & 검증 커맨드

```bash
npm run dev       # 개발 서버 (Vite)
npm run build     # tsc -b && vite build (타입 체크 + 빌드)
npm run lint      # eslint .
npx tsc -b        # 타입 체크만
```

코드 변경 후 반드시 `npx tsc -b`로 타입 체크를 통과시켜야 한다.

## 디렉토리 구조

```
src/
├── pages/              # 페이지 컴포넌트 (라우트 단위)
├── components/
│   ├── ui/             # shadcn/ui 기본 컴포넌트 (직접 수정 최소화)
│   └── layout/         # 레이아웃 컴포넌트 (AppLayout, Sidebar, PageHeader)
├── api/                # API 클라이언트 & 타입 정의
│   ├── client.ts       # Axios 인스턴스 (baseURL, interceptor)
│   ├── types.ts        # 요청/응답 타입 (백엔드 DTO 미러링)
│   └── {resource}.ts   # 리소스별 API 함수 객체
├── hooks/              # 커스텀 React 훅 (React Query 래핑)
├── lib/                # 유틸리티
│   ├── utils.ts        # cn() 등 범용 유틸
│   ├── constants.ts    # 상수 맵 (상태 라벨, 색상, 모델 옵션 등)
│   ├── format.ts       # 포맷 함수 (날짜, 상태 텍스트 등)
│   └── query-keys.ts   # React Query 키 팩토리
└── assets/             # 정적 에셋
```

## 핵심 아키텍처 규칙

### 1. Path Alias

`@/*` → `src/*` 단일 alias만 사용한다.

```typescript
// GOOD
import { Button } from '@/components/ui/button';
import { useWorkflows } from '@/hooks/useWorkflows';

// BAD — 상대 경로
import { Button } from '../../components/ui/button';
```

### 2. API 레이어 패턴

API 호출은 `api/` 디렉토리에 격리한다. 컴포넌트에서 Axios를 직접 호출하지 않는다.

```typescript
// api/{resource}.ts — 리소스별 API 함수 객체
export const workflowsApi = {
  list: () => apiClient.get<unknown, WorkflowListItem[]>('/workflows'),
  get: (id: string) => apiClient.get<unknown, WorkflowResponse>(`/workflows/${id}`),
  create: (data: CreateWorkflowRequest) =>
    apiClient.post<unknown, WorkflowResponse>('/workflows', data),
};
```

- 모든 API 타입은 `api/types.ts`에 정의한다
- 백엔드 DTO 변경 시 `api/types.ts`를 동기화한다
- `apiClient`의 response interceptor가 `response.data`를 자동 추출한다

### 3. React Query 훅 패턴

서버 상태는 반드시 React Query를 통해 관리한다. 커스텀 훅으로 래핑하여 사용한다.

```typescript
// hooks/use{Resource}.ts
export function useWorkflows() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.workflows.all,
    queryFn: () => workflowsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkflowRequest) => workflowsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });

  return { listQuery, createMutation };
}
```

- Query Key는 `lib/query-keys.ts`의 `queryKeys` 팩토리로 관리한다
- mutation 성공 시 관련 쿼리를 `invalidateQueries`로 갱신한다
- 페이지 컴포넌트에서 직접 `useQuery`/`useMutation`을 사용하지 않는다

### 4. 컴포넌트 작성 패턴

함수 선언(`function`) + named export를 사용한다.

```typescript
// GOOD
interface StatusBadgeProps {
  status: WorkflowRunStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge>{formatRunStatus(status)}</Badge>;
}

// BAD — default export, arrow function component
export default ({ status }) => { ... };
```

- Props는 컴포넌트 바로 위에 `interface`로 정의한다
- `export default`는 `App.tsx` 만 예외적으로 허용한다
- 페이지 컴포넌트: `pages/{PageName}Page.tsx`
- 공통 컴포넌트: `components/{ComponentName}.tsx`
- UI 컴포넌트: `components/ui/{component}.tsx` (shadcn 생성, 직접 수정 최소화)

### 5. 스타일링 규칙

Tailwind CSS 유틸리티 클래스를 사용한다.

```typescript
// 클래스 병합 시 cn() 유틸 사용
import { cn } from '@/lib/utils';

<div className={cn('p-4 rounded-lg', isActive && 'bg-green-100')} />
```

- 인라인 `style` 속성 사용을 지양한다 — Tailwind 클래스로 대체
- 조건부 클래스는 `cn()` (`clsx` + `tailwind-merge`)으로 처리한다
- 색상/크기 등 디자인 토큰은 `constants.ts`의 상수 맵으로 관리한다

### 6. 상수 & 포맷 관리

UI에 표시되는 상태 텍스트, 색상, 옵션 목록 등은 `lib/constants.ts`에 정의한다.

```typescript
// lib/constants.ts
export const RUN_STATUS_COLOR: Record<WorkflowRunStatus, string> = {
  RUNNING: 'bg-green-100 text-green-800',
  ...
};

// lib/format.ts — 포맷 함수
export function formatDate(iso: string): string { ... }
export function formatRunStatus(status: WorkflowRunStatus): string { ... }
```

### 7. 라우팅

React Router DOM을 사용한다. 모든 라우트는 `App.tsx`에서 선언한다.

```
/                          → DashboardPage
/workflows                 → WorkflowListPage
/workflows/new             → WorkflowFormPage
/workflows/:id/edit        → WorkflowFormPage
/gits                      → GitManagementPage
/mcp-servers               → McpServerManagementPage
/workflow-runs/:id         → WorkflowRunDetailPage
/workflow-runs/:id/agent   → AgentSessionPage
```

### 8. 개발 서버 프록시

Vite dev 서버가 `/api` 요청을 백엔드로 프록시한다:

- `/api/*` → `http://localhost:3000/*` (`/api` prefix 제거)
- 프론트엔드 코드에서는 `/api` prefix를 사용한다 (`VITE_API_URL` 환경변수 또는 기본값 `/api`)

## 금지 사항

- `any` 타입 사용 금지 — `unknown` 사용 후 타입 가드로 좁히기
- 컴포넌트에서 Axios 직접 호출 금지 — `api/` 모듈과 커스텀 훅을 통해 접근
- `components/ui/` 파일 직접 수정 최소화 — shadcn이 생성한 코드. 커스터마이징 필요 시 래핑 컴포넌트 작성
- 상대 경로 import 금지 — `@/*` alias 사용
- 인라인 매직 스트링 금지 — 상태 라벨, 색상 등은 `constants.ts`에 정의
