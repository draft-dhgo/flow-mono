# 에이전트 세션 페이지

## 페이지 목적

실행 중인 워크플로우의 에이전트와 채팅 형태로 인터랙션하는 페이지. 에이전트에 쿼리를 전송하고 응답을 실시간으로 확인한다. QueryResult의 타입(text/error)에 따라 적절한 렌더링을 수행한다.

## 라우트 경로

```
GET /workflow-runs/:id/agent
```

## 와이어프레임

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  에이전트 세션 — PROJ-123 Work #2                     │
│             │  모델: claude-opus-4-6  │  상태: 🟢 활성              │
│             │  [← 실행 상세로 돌아가기]            [세션 종료]      │
│             │                                                       │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │                                                   │ │
│             │  │  ┌─────────────────────────────────────────────┐  │ │
│             │  │  │ 🤖 Agent                                    │  │ │
│             │  │  │                                             │  │ │
│             │  │  │ 코드 분석을 완료했습니다.                   │  │ │
│             │  │  │                                             │  │ │
│             │  │  │ ## 주요 발견사항                             │  │ │
│             │  │  │ 1. `UserService`에서 N+1 쿼리 발생          │  │ │
│             │  │  │ 2. 인증 미들웨어에 rate limiting 부재       │  │ │
│             │  │  │ 3. 에러 핸들링이 불완전한 엔드포인트 3곳    │  │ │
│             │  │  │                                             │  │ │
│             │  │  │ ```typescript                               │  │ │
│             │  │  │ // 문제 코드 예시                            │  │ │
│             │  │  │ const users = await repo.findAll();          │  │ │
│             │  │  │ ```                                         │  │ │
│             │  │  └─────────────────────────────────────────────┘  │ │
│             │  │                                                   │ │
│             │  │  ┌─────────────────────────────────────────────┐  │ │
│             │  │  │ 👤 You                                      │  │ │
│             │  │  │ UserService의 N+1 문제를 수정해 주세요.     │  │ │
│             │  │  └─────────────────────────────────────────────┘  │ │
│             │  │                                                   │ │
│             │  │  ┌─────────────────────────────────────────────┐  │ │
│             │  │  │ 🤖 Agent                                    │  │ │
│             │  │  │                                             │  │ │
│             │  │  │ N+1 쿼리 문제를 수정하겠습니다.            │  │ │
│             │  │  │ `findAll()` → `findAllWithRelations()` ...  │  │ │
│             │  │  └─────────────────────────────────────────────┘  │ │
│             │  │                                                   │ │
│             │  │  ┌─────────────────────────────────────────────┐  │ │
│             │  │  │ ❌ Error                                    │  │ │
│             │  │  │ Agent timeout: 작업이 시간 초과되었습니다.  │  │ │
│             │  │  └─────────────────────────────────────────────┘  │ │
│             │  │                                                   │ │
│             │  └───────────────────────────────────────────────────┘ │
│             │                                                       │
│             │  ┌───────────────────────────────────────────────────┐ │
│             │  │ [쿼리를 입력하세요...                    ] [전송] │ │
│             │  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 컴포넌트 트리

```
AgentSessionPage
├── [Loading] → LoadingSpinner ("세션 정보 로딩 중...")
│     (runDetail 또는 agentSession 쿼리 로딩 중)
│
├── [No WorkExecution] → EmptyState
│     ├── Message ("현재 활성 WorkExecution이 없습니다")
│     └── BackLink → /workflow-runs/:id
│
├── [No Session] → EmptyState
│     ├── Message ("에이전트 세션이 활성화되지 않았습니다")
│     └── BackLink → /workflow-runs/:id
│
├── [Session Active] →
│   ├── SessionHeader
│   │   ├── BackLink → /workflow-runs/:id
│   │   ├── SessionInfo
│   │   │   ├── Title ("에이전트 세션 — {issueKey} Work #{sequence}")
│   │   │   ├── ModelBadge (agentSession.model)
│   │   │   └── StatusIndicator (활성/비활성)
│   │   └── StopSessionButton → StopConfirmDialog
│   │
│   ├── ChatContainer (flex-col, 스크롤 영역)
│   │   └── MessageList (역순 렌더링, 자동 스크롤)
│   │       └── ChatMessage (반복)
│   │           ├── AgentMessage (type: text)
│   │           │   ├── AgentAvatar
│   │           │   └── MarkdownContent (react-markdown 렌더링)
│   │           │       ├── 코드 블록 (syntax highlighting)
│   │           │       ├── 테이블
│   │           │       └── 기타 마크다운 요소
│   │           ├── UserMessage (쿼리)
│   │           │   ├── UserAvatar
│   │           │   └── PlainText (query)
│   │           └── ErrorMessage (type: error)
│   │               ├── ErrorIcon
│   │               └── ErrorText (빨간색 배경)
│   │
│   ├── QueryInput
│   │   ├── TextArea (auto-resize, Ctrl+Enter 전송)
│   │   ├── SendButton (전송 중이면 disabled + spinner)
│   │   └── HintText ("Ctrl+Enter로 전송")
│   │
│   ├── StopConfirmDialog
│   │   ├── WarningMessage ("세션을 종료하면 에이전트 프로세스가 중단됩니다")
│   │   └── FormActions
│   │       ├── CancelButton
│   │       └── StopButton ("세션 종료", destructive)
│   │
│   └── LoadingOverlay (쿼리 처리 중 표시)
```

## 필요 API 호출

**ID 해석 흐름:** 라우트 파라미터 `runId` → WorkflowRun 상세 조회 → `currentWorkExecutionId` 추출 → 에이전트 세션 API 호출

| API | 용도 | 호출 시점 |
|-----|------|-----------|
| `GET /workflow-runs/:runId` | WorkflowRun 상세 조회 (currentWorkIndex, workExecutionIds) | 페이지 로드 |
| `GET /agent-sessions/:workExecutionId` | 활성 에이전트 세션 존재 여부 및 정보 조회 | 페이지 로드 (workExecutionId 확보 후) |
| `POST /agent-sessions/:workExecutionId/queries` | 에이전트에 쿼리 전송 | 메시지 전송 |
| `DELETE /agent-sessions/:workExecutionId` | 에이전트 세션 종료 | 세션 종료 버튼 |

**참고:**
- 에이전트 세션 자체는 워크플로우 실행 시 백엔드에서 자동으로 시작된다. 이 페이지는 이미 시작된 세션에 쿼리를 보내는 용도이다.
- 백엔드 API의 `:id` 파라미터는 `AgentSessionId`가 아니라 `workExecutionId`이다. 백엔드가 내부적으로 `findByWorkExecutionId()`를 통해 세션을 찾는다.

**추가 필요 API:**
- `GET /agent-sessions/:workExecutionId/history` — 이전 쿼리/응답 히스토리 (선택적, 세션 재접속 시 필요)

## 상태 관리

```typescript
// ===== 라우트 파라미터 =====
const { id: runId } = useParams<{ id: string }>();

// ===== Step 1: WorkflowRun 상세 조회 → workExecutionId 추출 =====
const { data: runDetail, isLoading: isRunLoading } = useQuery({
  queryKey: queryKeys.workflowRuns.detail(runId),
  queryFn: () => workflowRunsApi.getDetail(runId),
});

// WorkflowRun에서 현재 활성 WorkExecution의 ID를 도출
// runDetail.workExecutionIds[runDetail.currentWorkIndex]
const workExecutionId = runDetail
  ? runDetail.workExecutionIds[runDetail.currentWorkIndex] ?? null
  : null;

// ===== Step 2: workExecutionId로 에이전트 세션 존재 여부 확인 =====
const {
  data: agentSession,
  isLoading: isSessionLoading,
} = useQuery({
  queryKey: ['agent-sessions', workExecutionId],
  queryFn: () => agentSessionsApi.getByWorkExecution(workExecutionId!),
  enabled: !!workExecutionId,
});

// ===== 로딩 / 비존재 상태 판별 =====
const isLoading = isRunLoading || (!!workExecutionId && isSessionLoading);
const hasNoWorkExecution = !isRunLoading && !workExecutionId;
const hasNoSession = !isSessionLoading && !!workExecutionId && !agentSession;

// ===== 채팅 메시지 로컬 상태 =====
interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'error';
  content: string;
  timestamp: Date;
}

const [messages, setMessages] = useState<ChatMessage[]>([]);
const [query, setQuery] = useState('');

// ===== 쿼리 전송 뮤테이션 =====
// 백엔드 API는 workExecutionId를 path param으로 받는다 (내부에서 세션을 찾음)
const sendQueryMutation = useMutation({
  mutationFn: (query: string) =>
    agentSessionsApi.sendQuery(workExecutionId!, query),
  onMutate: (query) => {
    // Optimistic: 사용자 메시지 즉시 추가
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
  },
  onSuccess: (result) => {
    // 에이전트 응답 추가
    const agentMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: result.type === 'error' ? 'error' : 'agent',
      content: result.content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, agentMessage]);
  },
  onError: (error) => {
    // 네트워크 에러
    const errorMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'error',
      content: `전송 실패: ${error.message}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, errorMessage]);
  },
});

// ===== 세션 종료 뮤테이션 =====
const stopSessionMutation = useMutation({
  mutationFn: () => agentSessionsApi.stop(workExecutionId!),
  onSuccess: () => navigate(`/workflow-runs/${runId}`),
});
```

## 사용자 인터랙션 흐름

1. **페이지 진입** → 라우트에서 `runId` 추출 → WorkflowRun 상세 조회
2. **workExecutionId 해석** → `runDetail.workExecutionIds[runDetail.currentWorkIndex]`로 현재 활성 WorkExecution ID 도출
3. **WorkExecution이 없으면** → "현재 활성 WorkExecution이 없습니다" 안내 + 실행 상세로 돌아가기 링크
4. **에이전트 세션 조회** → `GET /agent-sessions/:workExecutionId`로 세션 존재 여부 확인
5. **세션이 없으면** → "에이전트 세션이 활성화되지 않았습니다" 안내 + 실행 상세로 돌아가기 링크
6. **세션이 있으면** → 채팅 UI 렌더링 (SessionHeader에 `agentSession.model` 표시)
7. **쿼리 입력** → TextArea에 입력, Ctrl+Enter 또는 전송 버튼으로 전송
8. **전송 중** → 사용자 메시지 즉시 표시 (Optimistic UI), 전송 버튼 disabled, 로딩 표시
9. **응답 수신** → `type: text`이면 마크다운 렌더링, `type: error`이면 빨간 배경 에러 표시
10. **자동 스크롤** → 새 메시지 추가 시 채팅 영역 하단으로 자동 스크롤
11. **세션 종료** → "세션 종료" 클릭 → 확인 다이얼로그 → `DELETE /agent-sessions/:workExecutionId` 호출 → 실행 상세로 이동

## 마크다운 렌더링 설정

```typescript
// react-markdown 설정
<ReactMarkdown
  components={{
    code({ inline, className, children }) {
      // 코드 블록: syntax highlighting (선택적으로 prism-react-renderer)
      // 인라인 코드: <code> 태그
    },
    table({ children }) {
      // 테이블: Tailwind 스타일 적용
    },
  }}
>
  {message.content}
</ReactMarkdown>
```

## 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `Ctrl + Enter` | 쿼리 전송 |
| `Escape` | 입력 취소 (포커스 해제) |
