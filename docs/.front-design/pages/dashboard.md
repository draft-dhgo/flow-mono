# 대시보드 페이지

## 페이지 목적

워크플로우 실행 현황을 한눈에 파악하고, 실행 중인 워크플로우에 대한 빠른 액션을 수행할 수 있는 랜딩 페이지.

## 라우트 경로

```
GET /
```

## 와이어프레임

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Dashboard                                            │
│             │                                                       │
│  Dashboard  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  Workflows  │  │Running │ │Paused  │ │Awaiting│ │Completed│ │Cancelled│ │
│  Git        │  │   3    │ │   1    │ │   2    │ │  12    │ │   2    │ │
│  MCP Servers│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │
│             │                                                       │
│             │  최근 실행 목록                         [새 실행 +]   │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │ Name          │ Status  │ Progress   │ Actions   │ │
│             │  ├───────────────┼─────────┼────────────┼───────────┤ │
│             │  │ PROJ-123 v2   │🟢 실행중│ Work 2/4   │ ⏸ ✕      │ │
│             │  │               │         │ Task 1/3   │           │ │
│             │  ├───────────────┼─────────┼────────────┼───────────┤ │
│             │  │ PROJ-456 v1   │🟡 일시정│ Work 1/2   │ ▶ ✕      │ │
│             │  │               │         │ Task 3/3   │           │ │
│             │  ├───────────────┼─────────┼────────────┼───────────┤ │
│             │  │ PROJ-012 v2   │🟠 대기중│ Work 2/3   │ ▶ ✕      │ │
│             │  │               │         │ Task 2/2   │           │ │
│             │  ├───────────────┼─────────┼────────────┼───────────┤ │
│             │  │ PROJ-789 v3   │🟢 실행중│ Work 3/3   │ ⏸ ✕      │ │
│             │  │               │         │ Task 2/5   │           │ │
│             │  ├───────────────┼─────────┼────────────┼───────────┤ │
│             │  │ PROJ-101 v1   │✅ 완료  │ Work 2/2   │ 🗑        │ │
│             │  │               │         │ Task 4/4   │           │ │
│             │  └───────────────┴─────────┴────────────┴───────────┘ │
│             │                                                       │
│             │  [← 이전]  페이지 1 / 3  [다음 →]                    │
└─────────────────────────────────────────────────────────────────────┘
```

## 컴포넌트 트리

```
DashboardPage
├── PageHeader (title="Dashboard")
├── RunSummaryCards
│   ├── SummaryCard (label="실행 중", count, color="green", icon=Play)
│   ├── SummaryCard (label="일시정지", count, color="yellow", icon=Pause)
│   ├── SummaryCard (label="대기 중", count, color="orange", icon=Clock)
│   ├── SummaryCard (label="완료", count, color="blue", icon=CheckCircle)
│   └── SummaryCard (label="취소", count, color="red", icon=XCircle)
├── RecentRunsSection
│   ├── SectionHeader (title="최근 실행 목록", action=<NewRunButton>)
│   └── RunsTable
│       └── RunRow (반복)
│           ├── WorkflowNameCell (name, issueKey)
│           ├── StatusBadge (status)
│           ├── ProgressCell
│           │   ├── ProgressBar (currentWorkIndex / totalWorks)
│           │   └── ProgressLabel ("Work 2/4, Task 1/3")
│           └── ActionButtons
│               ├── PauseButton (if RUNNING)
│               ├── ResumeButton (if PAUSED | AWAITING)
│               ├── CancelButton (if RUNNING | PAUSED | AWAITING)
│               └── DeleteButton (if COMPLETED | CANCELLED)
└── Pagination
```

## 필요 API 호출

| API | 용도 | 호출 시점 |
|-----|------|-----------|
| `GET /workflow-runs/summary` | 상태별 실행 카운트 | 페이지 로드, 폴링 |
| `GET /workflow-runs?sort=createdAt&order=desc` | 최근 실행 목록 | 페이지 로드, 폴링 |
| `POST /workflow-runs/:id/pause` | 실행 일시정지 | 액션 버튼 클릭 |
| `POST /workflow-runs/:id/resume` | 실행 재개 | 액션 버튼 클릭 |
| `POST /workflow-runs/:id/cancel` | 실행 취소 | 확인 다이얼로그 후 |
| `DELETE /workflow-runs/:id` | 실행 기록 삭제 | 확인 다이얼로그 후 |

**추가 필요 API:**
- `GET /workflow-runs/summary` — 상태별 카운트 집계 (없으면 목록에서 클라이언트 집계)
- `GET /workflow-runs` — 목록 조회 (페이지네이션, 정렬, 필터)

## 상태 관리

```typescript
// TanStack Query
const { data: summary } = useQuery({
  queryKey: ['workflow-runs', 'summary'],
  queryFn: () => workflowRunsApi.getSummary(),
  refetchInterval: 3000,  // 3초 폴링
});

const { data: runs } = useQuery({
  queryKey: ['workflow-runs', { page, sort }],
  queryFn: () => workflowRunsApi.list({ page, sort }),
  refetchInterval: 3000,
});

// 뮤테이션
const pauseMutation = useMutation({
  mutationFn: (id: string) => workflowRunsApi.pause(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['workflow-runs'] });
  },
});
```

## 사용자 인터랙션 흐름

1. **페이지 진입** → 요약 카운트 + 최근 실행 목록 로드 (3초 자동 폴링)
2. **요약 카드 클릭** → 해당 상태로 필터링된 목록 표시 (선택적)
3. **실행 행 클릭** → `/workflow-runs/:id` 상세 페이지로 이동
4. **일시정지 버튼** → 즉시 `POST pause` 호출, 성공 시 상태 반영
5. **재개 버튼** → 즉시 `POST resume` 호출, 성공 시 상태 반영
6. **취소 버튼** → ConfirmDialog 표시 ("정말 취소하시겠습니까?"), reason 입력 → `POST cancel`
7. **삭제 버튼** → ConfirmDialog 표시 → `DELETE` 호출
8. **새 실행 버튼** → 워크플로우 선택 모달 → `POST /workflow-runs`
