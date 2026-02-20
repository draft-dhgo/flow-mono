# MCP 서버 관리 페이지

## 페이지 목적

MCP(Model Context Protocol) 서버를 등록/해제하는 관리 페이지. Transport 타입에 따른 조건부 필드를 제공하며, 참조하는 워크플로우가 있을 경우 삭제를 차단한다.

## 라우트 경로

```
GET /mcp-servers
```

## 와이어프레임

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  MCP 서버 관리                         [+ 서버 등록]  │
│             │                                                       │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │ Name           │ Transport │ Command/URL  │ 참조│⋮│ │
│             │  ├────────────────┼───────────┼──────────────┼─────┼─┤ │
│             │  │ code-search    │ STDIO     │ npx search   │  2  │⋮│ │
│             │  ├────────────────┼───────────┼──────────────┼─────┼─┤ │
│             │  │ web-browser    │ SSE       │ https://...  │  1  │⋮│ │
│             │  ├────────────────┼───────────┼──────────────┼─────┼─┤ │
│             │  │ file-manager   │ STDIO     │ node fm.js   │  0  │⋮│ │
│             │  └────────────────┴───────────┴──────────────┴─────┴─┘ │
│             │                                                       │
│             │  ── 서버 등록 다이얼로그 ──────────────────────────── │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │  이름 *           [code-search               ]    │ │
│             │  │  Command *        [npx                       ]    │ │
│             │  │                                                   │ │
│             │  │  Arguments                                        │ │
│             │  │  ┌──────────────────────────────────┐             │ │
│             │  │  │ [--scope=project     ] [✕]       │             │ │
│             │  │  │ [--verbose           ] [✕]       │             │ │
│             │  │  │ [+ 인자 추가]                    │             │ │
│             │  │  └──────────────────────────────────┘             │ │
│             │  │                                                   │ │
│             │  │  Environment Variables                             │ │
│             │  │  ┌──────────────────────────────────┐             │ │
│             │  │  │ Key: [API_KEY ] Value: [sk-...] [✕]│           │ │
│             │  │  │ Key: [TIMEOUT ] Value: [30   ] [✕]│           │ │
│             │  │  │ [+ 환경변수 추가]                │             │ │
│             │  │  └──────────────────────────────────┘             │ │
│             │  │                                                   │ │
│             │  │  Transport Type *  (●) STDIO  ( ) SSE             │ │
│             │  │                    ( ) STREAMABLE_HTTP             │ │
│             │  │                                                   │ │
│             │  │  URL  [비활성 — STDIO 모드에서는 불필요]          │ │
│             │  │       ※ SSE/STREAMABLE_HTTP 선택 시 URL 필수      │ │
│             │  │                                                   │ │
│             │  │                               [취소]  [등록]      │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ── 삭제 확인 다이얼로그 (참조 있음 — 차단) ────────── │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │  ⚠ 이 서버를 참조하는 워크플로우가 2개 있습니다  │ │
│             │  │                                                   │ │
│             │  │  - 프로젝트 A (PROJ-123)                          │ │
│             │  │  - 프로젝트 B (PROJ-456)                          │ │
│             │  │                                                   │ │
│             │  │  이 서버를 참조하는 워크플로우가 있어 해제할 수   │ │
│             │  │  없습니다. 먼저 해당 워크플로우에서 참조를         │ │
│             │  │  제거하세요.                                       │ │
│             │  │                                                   │ │
│             │  │                          [닫기]  [해제 (비활성)]  │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ── 삭제 확인 다이얼로그 (참조 없음 — 허용) ────────── │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │  "file-manager" 서버를 해제하시겠습니까?          │ │
│             │  │                                                   │ │
│             │  │  이 작업은 되돌릴 수 없습니다.                    │ │
│             │  │                                                   │ │
│             │  │                          [취소]  [해제]           │ │
│             │  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 컴포넌트 트리

```
McpServerManagementPage
├── PageHeader (title="MCP 서버 관리", action=<RegisterButton>)
├── McpServerTable
│   ├── DataTable
│   │   └── McpServerRow (반복)
│   │       ├── NameCell (name)
│   │       ├── TransportBadge (STDIO=회색, SSE=파란, STREAMABLE_HTTP=보라)
│   │       ├── EndpointCell
│   │       │   ├── CommandDisplay (STDIO일 때: command + args 축약)
│   │       │   └── UrlDisplay (SSE/STREAMABLE_HTTP일 때: url)
│   │       ├── RefCountCell (참조하는 워크플로우 수)
│   │       └── RowActions
│   │           └── UnregisterAction → McpDeleteDialog
│   └── EmptyState (등록된 서버가 없을 때)
│
├── McpRegisterDialog (모달)
│   ├── TextField (name, required)
│   ├── TextField (command, required)
│   ├── ArgsArrayEditor
│   │   └── ArgRow (반복)
│   │       ├── TextField (arg value)
│   │       └── RemoveButton
│   │   └── AddArgButton
│   ├── EnvEditor (키-값 쌍)
│   │   └── EnvRow (반복)
│   │       ├── TextField (key)
│   │       ├── TextField (value)
│   │       └── RemoveButton
│   │   └── AddEnvButton
│   ├── RadioGroup (transportType: STDIO | SSE | STREAMABLE_HTTP)
│   ├── TextField (url, conditional: SSE/STREAMABLE_HTTP일 때만 활성)
│   ├── ErrorAlert (등록 실패 시)
│   └── FormActions
│       ├── CancelButton
│       └── SubmitButton ("등록")
│
└── McpDeleteDialog (모달)
    ├── [refCount > 0] BlockedState
    │   ├── WarningMessage ("이 서버를 참조하는 워크플로우가 있어 해제할 수 없습니다...")
    │   ├── AffectedWorkflowList (참조하는 워크플로우 이름 목록)
    │   └── FormActions
    │       ├── CloseButton ("닫기")
    │       └── DeleteButton ("해제", disabled)
    └── [refCount === 0] AllowedState
        ├── ConfirmMessage ("서버를 해제하시겠습니까?")
        └── FormActions
            ├── CancelButton
            └── DeleteButton ("해제", destructive)
```

## 필요 API 호출

| API | 용도 | 호출 시점 |
|-----|------|-----------|
| `GET /mcp-servers` | MCP 서버 목록 조회 | 페이지 로드 |
| `POST /mcp-servers` | MCP 서버 등록 | 등록 폼 제출 |
| `DELETE /mcp-servers/:id` | MCP 서버 해제 | 삭제 확인 후 |
| `GET /workflows` | 참조하는 워크플로우 조회 (삭제 경고용) | 삭제 버튼 클릭 시 |

**추가 필요 API:**
- `GET /mcp-servers` — MCP 서버 목록 (id, name, command, args, env, transportType, url 포함)

## 상태 관리

```typescript
// 목록 쿼리
const { data: mcpServers } = useQuery({
  queryKey: queryKeys.mcpServers.all,
  queryFn: () => mcpServersApi.list(),
});

// 등록 뮤테이션
const registerMutation = useMutation({
  mutationFn: mcpServersApi.register,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
    closeDialog();
  },
});

// 해제 뮤테이션 (참조하는 워크플로우가 없을 때만 호출 가능)
const unregisterMutation = useMutation({
  mutationFn: (id: string) => mcpServersApi.unregister(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
  },
});
```

## 폼 유효성 검증

```typescript
const mcpServerFormSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  command: z.string().min(1, 'Command는 필수입니다'),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  transportType: z.enum(['STDIO', 'SSE', 'STREAMABLE_HTTP']),
  url: z.string().optional(),
}).refine(
  (data) => {
    if (data.transportType === 'SSE' || data.transportType === 'STREAMABLE_HTTP') {
      return !!data.url && data.url.length > 0;
    }
    return true;
  },
  {
    message: 'SSE/STREAMABLE_HTTP 타입은 URL이 필수입니다',
    path: ['url'],
  },
).refine(
  (data) => {
    if (data.transportType === 'STDIO') {
      return !data.url || data.url.length === 0;
    }
    return true;
  },
  {
    message: 'STDIO 타입에서는 URL을 지정할 수 없습니다',
    path: ['url'],
  },
);
```

## 사용자 인터랙션 흐름

1. **페이지 진입** → MCP 서버 목록 로드
2. **"서버 등록" 클릭** → 등록 다이얼로그 열림
3. **이름, Command 입력**
4. **Arguments 추가** (선택) → "+" 버튼으로 인자 행 추가, 각 행에 값 입력
5. **Environment Variables 추가** (선택) → "+" 버튼으로 키-값 쌍 추가
6. **Transport Type 선택**:
   - **STDIO 선택 시**: URL 필드 비활성화
   - **SSE / STREAMABLE_HTTP 선택 시**: URL 필드 활성화, 필수 입력
7. **"등록" 클릭** → 유효성 검증 → `POST /mcp-servers` → 성공 시 닫기 + 목록 새로고침
8. **해제 (⋮ → 해제)** → 참조 워크플로우 조회 → 다이얼로그 표시
   - **참조 있음 (refCount > 0)**: 참조 워크플로우 목록 표시 + 차단 메시지, 해제 버튼 비활성화 → 닫기만 가능
   - **참조 없음 (refCount === 0)**: 확인 다이얼로그 → `DELETE /mcp-servers/:id` 호출 → 성공 시 목록 새로고침
