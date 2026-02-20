# 워크플로우 실행 상세 페이지

## 페이지 목적

워크플로우 실행(WorkflowRun)의 전체 진행 상황을 상세하게 시각화하고, 일시정지/재개/취소/체크포인트 복원 등의 액션을 수행하는 페이지. Work → Task 단위의 스텝퍼 형태로 실행 진행을 추적하며, 완료된 Task의 리포트를 인라인으로 확인할 수 있다.

## 라우트 경로

```
GET /workflow-runs/:id
```

## 와이어프레임

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  실행 상세: PROJ-123 — "프로젝트 A"                   │
│             │                                                       │
│             │  상태: [🟢 RUNNING]   진행률: ████████░░░░ Work 2/4   │
│             │  (AWAITING 시: 상태: [🟠 AWAITING]  진행률: Work 2/4) │
│             │                                                       │
│             │  [⏸ 일시정지]  [✕ 취소]                               │
│             │  (AWAITING 시: [▶ 계속]  [✕ 취소])                    │
│             │                                                       │
│             │  ── 실행 타임라인 ──────────────────────────────────── │
│             │                                                       │
│             │  ✅ Work #1 — claude-sonnet-4-5 (완료)                │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │ ✅ Task 1/2 — "코드 분석 수행"      [리포트 보기]│ │
│             │  │ ✅ Task 2/2 — "테스트 코드 작성"                 │ │
│             │  │                                                   │ │
│             │  │ 📍 Checkpoint: 2024-01-15 14:30  [이 지점 복원]  │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  🔵 Work #2 — claude-opus-4-6 (진행 중)   ← 현재     │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │ ✅ Task 1/3 — "아키텍처 설계"       [리포트 보기]│ │
│             │  │ 🔵 Task 2/3 — "구현"               [실행 중...] │ │
│             │  │ ⬜ Task 3/3 — "리팩토링"                         │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ⬜ Work #3 — claude-haiku-4-5 (대기)                 │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │ ⬜ Task 1/1 — "코드 리뷰"                        │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ⬜ Work #4 — claude-sonnet-4-5 (대기, pauseAfter)   │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │ ⬜ Task 1/2 — "문서화"                            │ │
│             │  │ ⬜ Task 2/2 — "배포 준비"                         │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ── 리포트 뷰어 (Task 1 리포트 보기 클릭 시) ──────── │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │  📄 리포트: "코드 분석 수행"                      │ │
│             │  │  상태: ✅ COMPLETED                                │ │
│             │  │                                                   │ │
│             │  │  ## 1. 현재 아키텍처 분석                         │ │
│             │  │  현재 시스템은 모놀리식 구조로...                  │ │
│             │  │                                                   │ │
│             │  │  ## 2. 개선 제안사항                               │ │
│             │  │  마이크로서비스로의 전환을 권장...                 │ │
│             │  │                                         [닫기]    │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ── 체크포인트 ─────────────────────────────────────── │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │ #  │ Work │ 시점              │ Action            │ │
│             │  ├────┼──────┼───────────────────┼───────────────────┤ │
│             │  │ 1  │ 1    │ 2024-01-15 14:30  │ [이 지점으로 복원]│ │
│             │  │ 2  │ 2    │ 2024-01-15 15:10  │ [이 지점으로 복원]│ │
│             │  └────┴──────┴───────────────────┴───────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 컴포넌트 트리

```
WorkflowRunDetailPage
├── PageHeader
│   ├── BackLink → /
│   ├── Title (워크플로우 이름, 이슈 키)
│   └── StatusBadge (status)
│
├── RunOverview
│   ├── ProgressBar (currentWorkIndex / totalWorks)
│   ├── ProgressLabel ("Work 2/4")
│   └── ActionButtons
│       ├── PauseButton (if RUNNING)
│       ├── ResumeButton (if PAUSED | AWAITING)
│       │   ├── PAUSED: label="재개" → 체크포인트 복원 + 현재 Work 재실행
│       │   └── AWAITING: label="계속" → 다음 Work부터 실행 계속
│       ├── CancelButton (if RUNNING | PAUSED | AWAITING) → CancelDialog
│       └── AgentSessionButton (if RUNNING) → /workflow-runs/:id/agent
│
├── ExecutionTimeline
│   └── WorkExecutionStep (반복, 스텝퍼/아코디언)
│       ├── StepHeader
│       │   ├── StepIcon (✅ 완료 | 🔵 진행중 | 🟠 대기중(AWAITING) | ⬜ 대기 | ❌ 취소)
│       │   ├── StepTitle ("Work #N — {model}")
│       │   ├── StepStatus (완료/진행중/대기중/대기)
│       │   └── PauseAfterIndicator (pauseAfter 표시)
│       ├── TaskExecutionList (펼쳐짐)
│       │   └── TaskExecutionRow (반복)
│       │       ├── TaskIcon (✅ | 🔵 | ⬜ | ❌ | ⚠)
│       │       ├── TaskOrder (#N)
│       │       ├── TaskQuery (query 축약)
│       │       ├── TaskStatusBadge
│       │       └── ReportButton (if hasReport && isCompleted)
│       └── CheckpointMarker (해당 Work에 체크포인트가 있을 때)
│           ├── Timestamp
│           └── RestoreButton
│
├── ReportViewer (슬라이드오버 또는 모달)
│   ├── ReportHeader (Task query, status)
│   ├── ReportContent (마크다운 렌더링)
│   │   └── ReportSection (반복)
│   │       ├── SectionTitle
│   │       └── SectionContent (markdown)
│   └── CloseButton
│
├── CheckpointSection (PAUSED 또는 AWAITING 상태일 때 표시)
│   ├── SectionHeader ("체크포인트")
│   └── CheckpointTable
│       └── CheckpointRow (반복)
│           ├── SequenceCell
│           ├── WorkSequenceCell
│           ├── TimestampCell
│           └── RestoreButton → RestoreConfirmDialog
│
├── WorkNodeEditorSection (PAUSED | AWAITING 상태에서만 표시)
│   ├── SectionHeader ("Work Node 편집", addButton=<AddWorkNodeButton>)
│   ├── EditableIndicator ("Work #{editableFrom} 이후 편집 가능")
│   └── WorkNodeList
│       └── EditableWorkNode (editableFromSequence 이후의 work node마다)
│           ├── WorkNodeSummary (sequence, model, taskCount, pauseAfter)
│           ├── EditButton → WorkNodeEditDialog
│           └── DeleteButton → DeleteConfirmDialog
│
├── WorkNodeEditDialog (모달)
│   ├── Select (model, options=허용된 모델 목록)
│   ├── Checkbox (pauseAfter)
│   ├── TaskConfigsEditor
│   │   └── TaskConfigFieldArray (useFieldArray)
│   │       └── TaskConfigRow (반복)
│   │           ├── TextArea (query, required)
│   │           └── RemoveButton
│   │   └── AddTaskButton
│   └── FormActions
│       ├── CancelButton
│       └── SaveButton
│
├── WorkNodeAddDialog (모달)
│   ├── Select (model, required)
│   ├── Checkbox (pauseAfter)
│   ├── TaskConfigsEditor (최소 1개 Task 필요)
│   └── FormActions
│       ├── CancelButton
│       └── AddButton
│
├── CancelDialog
│   ├── TextArea (reason, optional)
│   └── FormActions
│
└── RestoreConfirmDialog
    ├── WarningMessage ("Work #{N} 이후 실행이 초기화됩니다")
    └── FormActions
```

## 필요 API 호출

| API | 용도 | 호출 시점 |
|-----|------|-----------|
| `GET /workflow-runs/:id` | 실행 상세 (WorkExecutions, TaskExecutions 포함) | 페이지 로드, 폴링 |
| `GET /workflow-runs/:id/checkpoints` | 체크포인트 목록 | 페이지 로드 |
| `GET /reports/:id` | 리포트 상세 내용 | 리포트 보기 클릭 |
| `POST /workflow-runs/:id/pause` | 일시정지 | 액션 버튼 |
| `POST /workflow-runs/:id/resume` | 재개 (checkpointId 선택적) | 액션 버튼 / 체크포인트 복원 |
| `POST /workflow-runs/:id/cancel` | 취소 | 확인 다이얼로그 후 |
| `DELETE /workflow-runs/:id` | 기록 삭제 | 종료 상태에서 삭제 |
| `PUT /workflow-runs/:id/work-nodes/:sequence` | Work Node 수정 (model, tasks, pauseAfter) | PAUSED/AWAITING에서 편집 |
| `POST /workflow-runs/:id/work-nodes` | Work Node 추가 | PAUSED/AWAITING에서 추가 |
| `DELETE /workflow-runs/:id/work-nodes/:sequence` | Work Node 삭제 | PAUSED/AWAITING에서 삭제 |

**추가 필요 API:**
- `GET /workflow-runs/:id` — 중첩된 WorkExecution + TaskExecution 전체 포함
- `GET /workflow-runs/:id/checkpoints` — 체크포인트 목록
- `GET /reports/:id` — 리포트 상세 (filePath에서 내용 읽기 또는 content 필드)

## 상태 관리

```typescript
// 실행 상세 쿼리 (진행 중이면 폴링)
const { data: runDetail } = useQuery({
  queryKey: queryKeys.workflowRuns.detail(id),
  queryFn: () => workflowRunsApi.getDetail(id),
  refetchInterval: (data) =>
    data?.status === 'RUNNING' ? 3000 : false,  // PAUSED, AWAITING은 안정 상태이므로 폴링 불필요
});

// 체크포인트 쿼리
const { data: checkpoints } = useQuery({
  queryKey: ['workflow-runs', id, 'checkpoints'],
  queryFn: () => workflowRunsApi.getCheckpoints(id),
  enabled: runDetail?.status === 'PAUSED' || runDetail?.status === 'AWAITING',
});

// 리포트 쿼리 (온디맨드)
const { data: report } = useQuery({
  queryKey: ['reports', selectedReportId],
  queryFn: () => reportsApi.get(selectedReportId!),
  enabled: !!selectedReportId,
});

// 뮤테이션들
const pauseMutation = useMutation({ ... });
const resumeMutation = useMutation({
  mutationFn: ({ id, checkpointId }: { id: string; checkpointId?: string }) =>
    workflowRunsApi.resume(id, checkpointId),
  ...
});
const cancelMutation = useMutation({ ... });

// Work Node CRUD 뮤테이션 (PAUSED | AWAITING 상태에서만 사용)
const editWorkNodeMutation = useMutation({
  mutationFn: ({ sequence, config }: { sequence: number; config: EditWorkNodeConfig }) =>
    workflowRunsApi.editWorkNode(id, sequence, config),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
  },
});

const addWorkNodeMutation = useMutation({
  mutationFn: (config: AddWorkNodeConfig) =>
    workflowRunsApi.addWorkNode(id, config),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
  },
});

const deleteWorkNodeMutation = useMutation({
  mutationFn: (sequence: number) =>
    workflowRunsApi.deleteWorkNode(id, sequence),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workflowRuns.detail(id) });
  },
});

// UI 상태
const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
const [showCancelDialog, setShowCancelDialog] = useState(false);
const [editingWorkNode, setEditingWorkNode] = useState<number | null>(null);
const [showAddWorkNode, setShowAddWorkNode] = useState(false);
```

## 실시간 업데이트 전략

**폴링 방식 (초기 구현):**
- `RUNNING` 상태일 때만 3초 간격 자동 폴링
- `PAUSED`, `AWAITING`, `COMPLETED`, `CANCELLED` 상태에서는 폴링 중단 (안정 상태)
- TanStack Query의 `refetchInterval` 옵션 활용

**향후 SSE 전환 고려:**
- `GET /workflow-runs/:id/events` SSE 엔드포인트 추가 시
- 이벤트 기반으로 전환하여 즉시 상태 반영 가능
- `EventSource` API 또는 `fetch` + `ReadableStream` 사용

## 사용자 인터랙션 흐름

1. **페이지 진입** → 실행 상세 + 체크포인트 로드, RUNNING이면 자동 폴링 시작
2. **타임라인 탐색** → WorkExecution 아코디언 열기/닫기로 Task 상세 확인
3. **리포트 보기** → 완료된 Task의 "리포트 보기" 클릭 → 사이드 패널에 마크다운 렌더링
4. **일시정지** → "일시정지" 클릭 → 즉시 `POST pause` → 상태 갱신
5. **PAUSED에서 재개** → "재개" 클릭 → 확인 다이얼로그("체크포인트에서 현재 Work를 재실행합니다") → `POST resume` (checkpointId 없이) → 체크포인트 복원 + 현재 Work 재실행
6. **AWAITING에서 계속** → "계속" 클릭 → `POST resume` (checkpointId 없이) → 다음 Work부터 실행 계속 (체크포인트 복원 없음)
7. **AWAITING 상태 진입 시** → 자동 폴링 중단, 완료된 Work에 체크포인트 마커 표시
8. **체크포인트 복원** → PAUSED 또는 AWAITING 상태에서 체크포인트 선택 → 확인 다이얼로그 → `POST resume` (checkpointId 포함) → 해당 Work 시점으로 복원
9. **취소** → "취소" 클릭 → reason 입력 다이얼로그 → `POST cancel` → 폴링 중단
10. **Work Node 편집** → PAUSED/AWAITING 상태에서 편집 가능한 Work Node의 "편집" 클릭 → 모달에서 model/tasks/pauseAfter 수정 → `PUT /workflow-runs/:id/work-nodes/:sequence`
11. **Work Node 추가** → PAUSED/AWAITING 상태에서 "작업 추가" 클릭 → 모달에서 설정 입력 → `POST /workflow-runs/:id/work-nodes` → 마지막 sequence에 추가
12. **Work Node 삭제** → PAUSED/AWAITING 상태에서 편집 가능한 Work Node의 "삭제" 클릭 → 확인 다이얼로그 → `DELETE /workflow-runs/:id/work-nodes/:sequence`
13. **에이전트 세션** → RUNNING 상태에서 "에이전트 세션" 클릭 → `/workflow-runs/:id/agent`

### Work Node 편집 가능 범위

편집 가능한 Work Node의 sequence 범위는 실행 상태에 따라 결정된다:
- **INITIALIZED**: 모든 노드 (sequence 0부터)
- **체크포인트 복원 직후**: currentWorkIndex부터
- **그 외 PAUSED/AWAITING**: currentWorkIndex + 1부터 (현재 실행 중인 Work 이후)
