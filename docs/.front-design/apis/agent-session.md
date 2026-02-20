# Agent Session API

> 소스: `src/agent/presentation/agent.controller.ts`

## 엔드포인트 목록

| Method | Path | 설명 | 구현 상태 | 프론트 호출 |
|--------|------|------|-----------|------------|
| `POST` | `/agent-sessions` | 에이전트 세션 시작 | 구현됨 | 백엔드 내부 호출 |
| `POST` | `/agent-sessions/:workExecutionId/queries` | 에이전트에 쿼리 전송 | 구현됨 | 프론트엔드 호출 |
| `DELETE` | `/agent-sessions/:workExecutionId` | 에이전트 세션 종료 | 구현됨 | 프론트엔드 호출 |
| `GET` | `/agent-sessions/:workExecutionId` | 세션 정보 조회 | **미구현** | 프론트엔드 필요 |

**핵심:** 모든 path parameter `:id`는 `workExecutionId`이다 (`agentSessionId`가 아님). 백엔드가 내부적으로 `findByWorkExecutionId()`를 통해 세션을 찾는다.

---

## POST /agent-sessions — 세션 시작 (백엔드 내부 호출)

> 이 엔드포인트는 워크플로우 실행 시 백엔드에서 자동으로 호출한다. 프론트엔드에서 직접 호출하지 않는다.

### 요청

```
POST /agent-sessions
Content-Type: application/json
```

```typescript
interface StartAgentSessionRequest {
  workExecutionId: string;                  // 필수, WorkExecution UUID
  workflowRunId: string;                    // 필수, WorkflowRun UUID
  model: string;                            // 필수, LLM 모델명
  workspacePath: string;                    // 필수, 작업 디렉토리 경로
  mcpServerConfigs: McpServerConfigInput[]; // 필수, MCP 서버 설정 배열
}

interface McpServerConfigInput {
  name: string;                     // 필수, 서버 이름
  command: string;                  // 필수, 실행 명령어
  args: string[];                   // 필수, 명령어 인자 배열
  env: Record<string, string>;     // 필수, 환경변수
  transportType: string;           // 필수, 트랜스포트 타입
  url: string | null;              // nullable, 서버 URL
}
```

### 응답

**Status:** `201 Created`

```typescript
interface StartAgentSessionResponse {
  agentSessionId: string;  // 생성된 세션 UUID
}
```

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 400 | `AGENT_INVARIANT_VIOLATION` | model 또는 workspacePath가 비어있음 |
| 500 | `AGENT_SESSION_CREATION_ERROR` | 에이전트 프로세스 시작 실패 |

---

## POST /agent-sessions/:workExecutionId/queries — 쿼리 전송

### 요청

```
POST /agent-sessions/{workExecutionId}/queries
Content-Type: application/json
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `workExecutionId` | `string` (UUID) | 현재 활성 WorkExecution의 ID |

```typescript
interface SendAgentQueryRequest {
  query: string;  // 필수, 에이전트에 보낼 쿼리
}
```

**Validation:**
- `query`: `@IsString()`, `@IsNotEmpty()`

### 응답

**Status:** `201 Created`

```typescript
interface QueryResultResponse {
  response: string;       // 에이전트 응답 텍스트 (마크다운 가능)
  tokensUsed?: number;    // 선택, 사용된 토큰 수
}
```

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `AGENT_SESSION_NOT_FOUND` | 해당 workExecutionId의 세션 없음 또는 세션 미초기화 |
| 500 | - | 에이전트 프로세스 오류 (타임아웃 등) |

### 사용 페이지

- [에이전트 세션](../pages/agent-session.md) — 쿼리 입력 후 전송

---

## DELETE /agent-sessions/:workExecutionId — 세션 종료

### 요청

```
DELETE /agent-sessions/{workExecutionId}
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `workExecutionId` | `string` (UUID) | 종료할 세션의 WorkExecution ID |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `AGENT_SESSION_NOT_FOUND` | 해당 workExecutionId의 세션 없음 |

### 사용 페이지

- [에이전트 세션](../pages/agent-session.md) — "세션 종료" 버튼

---

## GET /agent-sessions/:workExecutionId — 세션 정보 조회 (미구현)

프론트엔드에서 세션 존재 여부 및 정보를 확인하기 위해 필요한 API.

### 기대 응답

**Status:** `200 OK`

```typescript
interface AgentSessionResponse {
  id: string;                    // 세션 UUID
  workExecutionId: string;       // WorkExecution UUID
  workflowRunId: string;         // WorkflowRun UUID
  model: string;                 // LLM 모델명
  isAssigned: boolean;           // 에이전트 프로세스가 할당되었는지
}
```

**세션 없음:** `404 Not Found` 반환.

### 사용 페이지

- [에이전트 세션](../pages/agent-session.md) — 페이지 로드 시 세션 존재 여부 확인

---

## 프론트엔드 ID 해석 흐름

에이전트 세션 페이지는 라우트에 `runId`만 있으므로, 아래 3단계로 `workExecutionId`를 도출한다:

```
1. 라우트에서 runId 추출
   └─ URL: /workflow-runs/:runId/agent

2. WorkflowRun 상세 조회
   └─ GET /workflow-runs/:runId → { currentWorkIndex, workExecutionIds }

3. workExecutionId 도출
   └─ workExecutionIds[currentWorkIndex]

4. 에이전트 세션 API 호출
   └─ GET /agent-sessions/:workExecutionId (존재 확인)
   └─ POST /agent-sessions/:workExecutionId/queries (쿼리 전송)
   └─ DELETE /agent-sessions/:workExecutionId (종료)
```

**주의:** `GET /workflow-runs/:id` 응답에 `workExecutionIds`가 현재 포함되지 않으므로, 응답 확장이 선행되어야 한다. ([workflow-run.md](./workflow-run.md) 참조)
