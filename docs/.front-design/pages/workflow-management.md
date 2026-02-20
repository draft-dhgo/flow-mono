# 워크플로우 관리 페이지

## 페이지 목적

워크플로우를 목록으로 확인하고, 생성/수정/삭제를 수행하는 관리 페이지. 워크플로우의 중첩 구조(WorkDefinition → TaskDefinition, Git/MCP 참조)를 직관적으로 편집할 수 있는 폼을 제공한다.

## 라우트 경로

```
GET /workflows           → 목록 페이지
GET /workflows/new       → 생성 폼
GET /workflows/:id/edit  → 수정 폼
```

---

## 1. 워크플로우 목록 페이지 (`/workflows`)

### 와이어프레임

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  워크플로우 관리                    [+ 새 워크플로우]  │
│             │                                                       │
│             │  ┌──────────────────────────────────────────────────────────┐ │
│             │  │ Name         │ Status │ Issue Key │ Git │ MCP │ Works│ ⋮│ │
│             │  ├──────────────┼────────┼───────────┼─────┼─────┼──────┼──┤ │
│             │  │ 프로젝트 A   │ ACTIVE │ PROJ-123  │  2  │  1  │   3  │⋮│ │
│             │  ├──────────────┼────────┼───────────┼─────┼─────┼──────┼──┤ │
│             │  │ 프로젝트 B   │ DRAFT  │ PROJ-456  │  1  │  3  │   2  │⋮│ │
│             │  ├──────────────┼────────┼───────────┼─────┼─────┼──────┼──┤ │
│             │  │ 마이그레이션 │ ACTIVE │ MIG-001   │  3  │  0  │   5  │⋮│ │
│             │  └──────────────┴────────┴───────────┴─────┴─────┴──────┴──┘ │
│             │                                                              │
│             │  ⋮ 메뉴 (DRAFT):  [수정] [활성화] [삭제]                    │
│             │  ⋮ 메뉴 (ACTIVE): [실행] [비활성화]                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 컴포넌트 트리 (목록)

```
WorkflowListPage
├── PageHeader (title="워크플로우 관리", action=<CreateButton>)
├── DataTable
│   └── WorkflowRow (반복)
│       ├── NameCell (name)
│       ├── StatusBadge (status: DRAFT | ACTIVE)
│       ├── IssueKeyCell (issueKey)
│       ├── RefCountCell (gitRefCount)
│       ├── RefCountCell (mcpServerRefCount)
│       ├── WorkCountCell (workDefinitionCount)
│       └── RowActions (dropdown)
│           ├── EditAction (if DRAFT) → /workflows/:id/edit
│           ├── ActivateAction (if DRAFT) → POST /workflows/:id/activate
│           ├── DeactivateAction (if ACTIVE) → POST /workflows/:id/deactivate
│           ├── RunAction (if ACTIVE) → POST /workflow-runs
│           └── DeleteAction (if DRAFT) → ConfirmDialog → DELETE /workflows/:id
└── EmptyState (워크플로우가 없을 때)
```

---

## 2. 워크플로우 생성/수정 폼 (`/workflows/new`, `/workflows/:id/edit`)

### 와이어프레임

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  워크플로우 생성 (or 수정)                            │
│             │                                                       │
│             │  ── 기본 정보 ──────────────────────────────────────── │
│             │  이름 *        [                              ]        │
│             │  설명          [                              ]        │
│             │  이슈 키 *     [PROJ-123                      ]        │
│             │  브랜치 전략 * [feature/PROJ-123               ]       │
│             │                                                       │
│             │  ── Git 참조 ──────────────────────────── [+ 추가]── │
│             │  ┌──────────────────────────────────────────────────┐ │
│             │  │ Git 저장소 *          │ Base Branch *    │ 삭제  │ │
│             │  │ [▼ repo-backend     ] │ [main          ] │ [✕]   │ │
│             │  │ [▼ repo-frontend    ] │ [develop       ] │ [✕]   │ │
│             │  └──────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ── MCP 서버 참조 ─────────────────────── [+ 추가]── │
│             │  ┌──────────────────────────────────────────────────┐ │
│             │  │ MCP 서버 *            │ Env Overrides   │ 삭제  │ │
│             │  │ [▼ code-search      ] │ [편집]          │ [✕]   │ │
│             │  └──────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ── Work Definitions ──────────────────── [+ 추가]── │
│             │  ┌─ Work #1 ───────────────────────────── [⇅] [✕] ┐ │
│             │  │  모델 *   [▼ claude-sonnet-4-5-20250929]         │ │
│             │  │  완료 후 일시정지  [ ] pauseAfter                │ │
│             │  │                                                   │ │
│             │  │  Git 오버라이드 (선택)  [+ 추가]                  │ │
│             │  │  MCP 오버라이드 (선택)  [+ 추가]                  │ │
│             │  │                                                   │ │
│             │  │  ── Tasks ───────────────────────── [+ 추가] ──  │ │
│             │  │  ┌─ Task #1 ──────────────────────── [⇅] [✕] ┐  │ │
│             │  │  │  쿼리 *  [텍스트 영역...              ]    │  │ │
│             │  │  │  리포트 아웃라인 (선택)  [+ 섹션 추가]     │  │ │
│             │  │  │    ┌ 섹션 1: [타이틀] [설명]     [✕] ┐    │  │ │
│             │  │  │    └──────────────────────────────────┘    │  │ │
│             │  │  └────────────────────────────────────────────┘  │ │
│             │  │                                                   │ │
│             │  │  ┌─ Task #2 ──────────────────────── [⇅] [✕] ┐  │ │
│             │  │  │  쿼리 *  [텍스트 영역...              ]    │  │ │
│             │  │  └────────────────────────────────────────────┘  │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ┌─ Work #2 ──────────────────────────── [⇅] [✕] ┐  │
│             │  │  ...                                            │  │
│             │  └─────────────────────────────────────────────────┘  │
│             │                                                       │
│             │                              [취소]  [저장]           │
└─────────────────────────────────────────────────────────────────────┘
```

### 컴포넌트 트리 (폼)

```
WorkflowFormPage
├── PageHeader (title="워크플로우 생성" | "워크플로우 수정")
├── WorkflowForm (React Hook Form + Zod)
│   ├── BasicInfoSection
│   │   ├── TextField (name, required)
│   │   ├── TextArea (description)
│   │   ├── TextField (issueKey, required, pattern: /^[A-Z][A-Z0-9]+-\d+$/)
│   │   └── TextField (branchStrategy, required)
│   │
│   ├── GitRefsSection
│   │   ├── SectionHeader (title="Git 참조", addButton)
│   │   └── GitRefFieldArray (useFieldArray)
│   │       └── GitRefRow (반복)
│   │           ├── Select (gitId, options=등록된 Git 목록)
│   │           ├── TextField (baseBranch)
│   │           └── RemoveButton
│   │
│   ├── McpServerRefsSection
│   │   ├── SectionHeader (title="MCP 서버 참조", addButton)
│   │   └── McpServerRefFieldArray (useFieldArray)
│   │       └── McpServerRefRow (반복)
│   │           ├── Select (mcpServerId, options=등록된 MCP 서버 목록)
│   │           ├── EnvOverridesEditor (키-값 동적 편집)
│   │           └── RemoveButton
│   │
│   ├── WorkDefinitionsSection
│   │   ├── SectionHeader (title="Work Definitions", addButton)
│   │   └── WorkDefinitionFieldArray (useFieldArray, 드래그 정렬)
│   │       └── WorkDefinitionCard (반복, 접이식)
│   │           ├── DragHandle
│   │           ├── CardHeader (Work #{order}, removeButton)
│   │           ├── Select (model, options=허용된 모델 목록)
│   │           ├── Checkbox (pauseAfter)
│   │           ├── WorkGitRefsEditor (선택적 오버라이드)
│   │           ├── WorkMcpRefsEditor (선택적 오버라이드)
│   │           └── TaskDefinitionsEditor
│   │               └── TaskDefinitionFieldArray (useFieldArray, 드래그 정렬)
│   │                   └── TaskDefinitionCard (반복)
│   │                       ├── DragHandle
│   │                       ├── TextArea (query, required)
│   │                       └── ReportOutlineEditor (선택적)
│   │                           └── SectionFieldArray
│   │                               └── SectionRow (반복)
│   │                                   ├── TextField (title)
│   │                                   ├── TextField (description)
│   │                                   └── RemoveButton
│   │
│   └── FormActions
│       ├── CancelButton → /workflows
│       └── SubmitButton (생성 | 수정)
└── ConfirmDialog (취소 시 변경사항 버림 확인)
```

## 폼 유효성 검증 규칙

```typescript
const workflowFormSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  description: z.string().optional(),
  issueKey: z.string().regex(/^[A-Z][A-Z0-9]+-\d+$/, '이슈 키 형식: PROJ-123'),
  branchStrategy: z.string().min(1, '브랜치명은 필수입니다'),
  gitRefs: z.array(z.object({
    gitId: z.string().uuid('Git 저장소를 선택하세요'),
    baseBranch: z.string().min(1, 'Base branch는 필수입니다'),
  })).min(1, '최소 1개의 Git 참조가 필요합니다'),
  mcpServerRefs: z.array(z.object({
    mcpServerId: z.string().uuid('MCP 서버를 선택하세요'),
    envOverrides: z.record(z.string()).optional(),
  })).optional(),
  workDefinitions: z.array(z.object({
    order: z.number().min(0),
    model: z.enum(['claude-opus-4-6', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001']),
    pauseAfter: z.boolean().optional(),
    gitRefs: z.array(z.object({
      gitId: z.string().uuid(),
      baseBranch: z.string().min(1),
    })).optional(),
    mcpServerRefs: z.array(z.object({
      mcpServerId: z.string().uuid(),
      envOverrides: z.record(z.string()).optional(),
    })).optional(),
    taskDefinitions: z.array(z.object({
      order: z.number().min(0),
      query: z.string().min(1, '쿼리는 필수입니다'),
      reportOutline: z.object({
        sections: z.array(z.object({
          title: z.string().min(1),
          description: z.string().min(1),
        })).min(1),
      }).optional(),
    })).min(1, '최소 1개의 Task가 필요합니다'),
  })).min(1, '최소 1개의 Work Definition이 필요합니다'),
});
```

## 필요 API 호출

| API | 용도 | 호출 시점 |
|-----|------|-----------|
| `GET /workflows` | 목록 조회 | 목록 페이지 로드 |
| `GET /workflows/:id` | 수정 폼 초기값 로드 | 수정 페이지 로드 |
| `GET /gits` | Git 선택 드롭다운 옵션 | 폼 페이지 로드 |
| `GET /mcp-servers` | MCP 서버 선택 드롭다운 옵션 | 폼 페이지 로드 |
| `POST /workflows` | 워크플로우 생성 | 생성 폼 제출 |
| `PUT /workflows/:id` | 워크플로우 수정 | 수정 폼 제출 |
| `DELETE /workflows/:id` | 워크플로우 삭제 | 삭제 확인 후 |
| `POST /workflows/:id/activate` | 워크플로우 활성화 (DRAFT → ACTIVE) | 활성화 액션 클릭 |
| `POST /workflows/:id/deactivate` | 워크플로우 비활성화 (ACTIVE → DRAFT) | 비활성화 액션 클릭 |
| `POST /workflow-runs` | 목록에서 바로 실행 (ACTIVE만 가능) | 실행 액션 클릭 |

## 상태 관리

```typescript
// 목록 쿼리
const { data: workflows } = useQuery({
  queryKey: queryKeys.workflows.all,
  queryFn: () => workflowsApi.list(),
});

// 상세 쿼리 (수정 모드)
const { data: workflow } = useQuery({
  queryKey: queryKeys.workflows.detail(id),
  queryFn: () => workflowsApi.get(id),
  enabled: !!id,
});

// Git/MCP 선택 옵션 (폼에서 사용)
const { data: gits } = useQuery({ queryKey: queryKeys.gits.all, queryFn: gitsApi.list });
const { data: mcpServers } = useQuery({ queryKey: queryKeys.mcpServers.all, queryFn: mcpServersApi.list });

// 뮤테이션
const createMutation = useMutation({
  mutationFn: workflowsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
    navigate('/workflows');
  },
});

// 활성화/비활성화 뮤테이션
const activateMutation = useMutation({
  mutationFn: (id: string) => workflowsApi.activate(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
  },
});

const deactivateMutation = useMutation({
  mutationFn: (id: string) => workflowsApi.deactivate(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
  },
});
```

## 사용자 인터랙션 흐름

### 생성 흐름
1. 목록 → "새 워크플로우" 클릭 → `/workflows/new`
2. 기본 정보 입력 (이름, 이슈 키, 브랜치 전략)
3. Git 참조 추가 (드롭다운에서 선택 + baseBranch 입력)
4. MCP 서버 참조 추가 (선택사항)
5. Work Definition 추가 → 모델 선택 → Task 추가 → 쿼리 입력
6. (선택) 리포트 아웃라인 섹션 추가
7. (선택) Work별 Git/MCP 오버라이드 설정
8. "저장" → 유효성 검증 → `POST /workflows` → 목록으로 이동 (DRAFT 상태로 생성)

### 활성화 흐름
1. 목록에서 DRAFT 상태 워크플로우의 ⋮ → "활성화"
2. `POST /workflows/:id/activate` → Git/MCP 참조 유효성 검증
3. 성공 시 → 상태가 ACTIVE로 변경, 실행 가능 상태
4. 실패 시 → 에러 토스트 표시 (ex: "유효하지 않은 Git 참조가 있습니다")

### 비활성화 흐름
1. 목록에서 ACTIVE 상태 워크플로우의 ⋮ → "비활성화"
2. `POST /workflows/:id/deactivate` → DRAFT 상태로 복귀
3. 성공 시 → 수정/삭제 가능 상태

### 수정 흐름
1. 목록에서 DRAFT 상태 워크플로우의 ⋮ → "수정" → `/workflows/:id/edit`
2. 기존 데이터 로드 (폼에 채워짐)
3. 원하는 필드 수정
4. "저장" → 유효성 검증 → `PUT /workflows/:id` → 목록으로 이동

> **주의:** ACTIVE 상태에서는 수정 불가. 먼저 비활성화 후 수정해야 한다.

### 실행 흐름
1. 목록에서 ACTIVE 상태 워크플로우의 ⋮ → "실행"
2. `POST /workflow-runs` → 워크플로우 실행 시작
3. 성공 시 → 실행 상세 페이지(`/workflow-runs/:id`)로 이동

### 삭제 흐름
1. 목록에서 DRAFT 상태 워크플로우의 ⋮ → "삭제"
2. ConfirmDialog: "워크플로우 'XXX'를 삭제하시겠습니까?"
3. 확인 → `DELETE /workflows/:id` → 목록 새로고침

> **주의:** ACTIVE 상태에서는 삭제 불가. 먼저 비활성화 후 삭제해야 한다.

### 드래그 정렬
- Work Definition과 Task Definition은 드래그로 순서 변경 가능
- 드래그 시 order 값 자동 재계산
