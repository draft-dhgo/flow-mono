# Workflow Run API

> 소스: `src/workflow-runtime/presentation/workflow-runtime.controller.ts`

## 엔드포인트 목록

| Method | Path | 설명 | 구현 상태 |
|--------|------|------|-----------|
| `POST` | `/workflow-runs` | 워크플로우 실행 시작 | 구현됨 |
| `GET` | `/workflow-runs/:id` | 실행 상세 조회 | 구현됨 |
| `GET` | `/workflow-runs/:id/checkpoints` | 체크포인트 목록 조회 | 구현됨 |
| `POST` | `/workflow-runs/:id/pause` | 실행 일시정지 | 구현됨 |
| `POST` | `/workflow-runs/:id/resume` | 실행 재개 | 구현됨 |
| `POST` | `/workflow-runs/:id/cancel` | 실행 취소 | 구현됨 |
| `DELETE` | `/workflow-runs/:id` | 실행 기록 삭제 | 구현됨 |
| `PUT` | `/workflow-runs/:id/work-nodes/:sequence` | Work Node 수정 | 구현됨 |
| `POST` | `/workflow-runs/:id/work-nodes` | Work Node 추가 | 구현됨 |
| `DELETE` | `/workflow-runs/:id/work-nodes/:sequence` | Work Node 삭제 | 구현됨 |
| `GET` | `/workflow-runs` | 실행 목록 조회 | **미구현** |
| `GET` | `/workflow-runs/summary` | 대시보드용 요약 | **미구현** |
| `GET` | `/workflow-runs/:id/reports` | 리포트 목록 조회 | **미구현** |
| `GET` | `/reports/:id` | 리포트 상세 조회 | **미구현** |

---

## POST /workflow-runs — 실행 시작

### 요청

```
POST /workflow-runs
Content-Type: application/json
```

```typescript
interface StartWorkflowRunRequest {
  workflowId: string;  // 필수, 실행할 워크플로우 UUID (ACTIVE 상태여야 함)
}
```

**Validation:**
- `workflowId`: `@IsString()`, `@IsNotEmpty()`

### 응답

**Status:** `201 Created`

```typescript
interface StartWorkflowRunResponse {
  workflowRunId: string;  // 생성된 실행 UUID
}
```

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `WORKFLOW_NOT_FOUND` | 해당 워크플로우 없음 |
| 400 | `WORKFLOW_INVALID_STATE_TRANSITION` | 워크플로우가 ACTIVE 상태가 아님 |

### 사용 페이지

- [Workflow 관리](../pages/workflow-management.md) — ACTIVE 워크플로우의 "실행" 액션
- [Dashboard](../pages/dashboard.md) — "새 실행" 버튼

---

## GET /workflow-runs/:id — 실행 상세 조회

### 요청

```
GET /workflow-runs/{id}
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 워크플로우 실행 ID |

### 응답

**Status:** `200 OK`

```typescript
interface WorkflowRunDetailResponse {
  id: string;                              // UUID
  workflowId: string;                      // 워크플로우 UUID
  status: WorkflowRunStatus;               // 현재 상태
  currentWorkIndex: number;                // 현재 실행 중인 Work 인덱스 (0-based)
  totalWorkCount: number;                  // 전체 Work 수
  cancelledAtWorkIndex: number | null;     // 취소 시점 Work 인덱스
  cancellationReason: string | null;       // 취소 사유
  restoredToCheckpoint: boolean;           // 체크포인트 복원 여부
}

type WorkflowRunStatus =
  | 'INITIALIZED'
  | 'RUNNING'
  | 'PAUSED'
  | 'AWAITING'
  | 'COMPLETED'
  | 'CANCELLED';
```

**참고 — 현재 응답에 미포함된 필드:**

프론트엔드에서 전체 실행 타임라인을 렌더링하려면 아래 필드가 추가로 필요하다. 백엔드 엔티티에는 존재하지만 현재 컨트롤러 응답에 포함되지 않으므로, 응답 확장이 필요하다:

```typescript
// 응답 확장 제안
interface WorkflowRunDetailResponseExtended extends WorkflowRunDetailResponse {
  workExecutionIds: string[];              // WorkExecution UUID 배열
  workNodeConfigs: WorkNodeConfigSummary[]; // Work Node 설정 목록
}

interface WorkNodeConfigSummary {
  id: string;
  sequence: number;
  model: string;
  taskCount: number;       // taskConfigs.length
  pauseAfter: boolean;
}
```

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | - | 해당 ID의 실행 기록 없음 (`Error: WorkflowRun not found: {id}`) |

### 사용 페이지

- [실행 상세](../pages/workflow-run.md) — 페이지 로드, RUNNING 시 3초 폴링
- [에이전트 세션](../pages/agent-session.md) — workExecutionId 추출을 위한 조회

---

## GET /workflow-runs/:id/checkpoints — 체크포인트 목록

### 요청

```
GET /workflow-runs/{id}/checkpoints
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 워크플로우 실행 ID |

### 응답

**Status:** `200 OK`

```typescript
type CheckpointListResponse = CheckpointResponse[];

interface CheckpointResponse {
  id: string;                // 체크포인트 UUID
  workflowRunId: string;     // 실행 UUID
  workflowId: string;        // 워크플로우 UUID
  workExecutionId: string;   // WorkExecution UUID
  workSequence: number;      // 체크포인트 생성 시점의 Work 인덱스
  createdAt: string;         // ISO 8601 타임스탬프 (예: "2024-01-15T14:30:00.000Z")
}
```

### 사용 페이지

- [실행 상세](../pages/workflow-run.md) — PAUSED/AWAITING 상태에서 체크포인트 테이블, 복원 버튼

---

## POST /workflow-runs/:id/pause — 일시정지

### 요청

```
POST /workflow-runs/{id}/pause
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 일시정지할 실행 ID |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `RUNTIME_NOT_FOUND` | 해당 실행 기록 없음 |
| 400 | `RUNTIME_INVALID_STATE_TRANSITION` | RUNNING이 아닌 상태에서 일시정지 시도 |

### 사용 페이지

- [실행 상세](../pages/workflow-run.md) — "일시정지" 버튼 (RUNNING일 때)
- [Dashboard](../pages/dashboard.md) — 실행 행의 일시정지 버튼

---

## POST /workflow-runs/:id/resume — 재개

PAUSED와 AWAITING 상태 모두에서 호출 가능하지만, 백엔드 동작이 다르다:

- **PAUSED → resume**: 체크포인트에서 복원 후 현재 Work를 재실행
- **AWAITING → resume**: 체크포인트 복원 없이 다음 Work부터 실행 계속

### 요청

```
POST /workflow-runs/{id}/resume
Content-Type: application/json
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 재개할 실행 ID |

```typescript
interface ResumeWorkflowRunRequest {
  checkpointId?: string;  // 선택, 특정 체크포인트로 복원할 때 지정
}
```

**동작 분기:**

| 이전 상태 | checkpointId | 동작 |
|-----------|-------------|------|
| `PAUSED` | 없음 | 자동으로 이전 체크포인트 탐색 → 복원 → 현재 Work 재실행 |
| `PAUSED` | 있음 | 지정 체크포인트로 복원 → 해당 Work부터 재실행 |
| `AWAITING` | 없음 | 복원 없이 다음 Work부터 계속 실행 |
| `AWAITING` | 있음 | 지정 체크포인트로 복원 → 해당 Work부터 재실행 |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `RUNTIME_NOT_FOUND` | 해당 실행 기록 없음 |
| 400 | `RUNTIME_INVALID_STATE_TRANSITION` | PAUSED/AWAITING이 아닌 상태에서 재개 시도 |
| 404 | `CHECKPOINT_NOT_FOUND` | 지정한 checkpointId가 없음 |

### 사용 페이지

- [실행 상세](../pages/workflow-run.md) — "재개"(PAUSED) / "계속"(AWAITING) 버튼, 체크포인트 복원 버튼
- [Dashboard](../pages/dashboard.md) — 실행 행의 재개 버튼

---

## POST /workflow-runs/:id/cancel — 취소

### 요청

```
POST /workflow-runs/{id}/cancel
Content-Type: application/json
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 취소할 실행 ID |

```typescript
interface CancelWorkflowRunRequest {
  reason?: string;  // 선택, 취소 사유
}
```

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `RUNTIME_NOT_FOUND` | 해당 실행 기록 없음 |
| 400 | `RUNTIME_INVALID_STATE_TRANSITION` | 이미 종료 상태(COMPLETED/CANCELLED)에서 취소 시도 |

### 사용 페이지

- [실행 상세](../pages/workflow-run.md) — "취소" 버튼 (RUNNING/PAUSED/AWAITING일 때)
- [Dashboard](../pages/dashboard.md) — 실행 행의 취소 버튼

---

## DELETE /workflow-runs/:id — 실행 기록 삭제

### 요청

```
DELETE /workflow-runs/{id}
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 삭제할 실행 ID |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `RUNTIME_NOT_FOUND` | 해당 실행 기록 없음 |

### 사용 페이지

- [실행 상세](../pages/workflow-run.md) — 종료 상태에서 삭제
- [Dashboard](../pages/dashboard.md) — COMPLETED/CANCELLED 행의 삭제 버튼

---

## PUT /workflow-runs/:id/work-nodes/:sequence — Work Node 수정

PAUSED 또는 AWAITING 상태에서만 호출 가능. 편집 가능한 sequence 범위가 제한된다.

### 요청

```
PUT /workflow-runs/{id}/work-nodes/{sequence}
Content-Type: application/json
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 워크플로우 실행 ID |
| `sequence` | `number` (정수) | 수정할 Work Node sequence (0-based) |

```typescript
interface EditWorkNodeConfigRequest {
  model?: string;                      // 선택, 모델 변경
  taskConfigs?: TaskNodeConfigInput[];  // 선택, 태스크 목록 전체 교체
  pauseAfter?: boolean;                // 선택, 완료 후 일시정지 설정
}

interface TaskNodeConfigInput {
  order: number;   // 필수, >= 0
  query: string;   // 필수, 비어있지 않은 문자열
}
```

**Validation:**
- `model`: `@IsString()`, `@IsOptional()`
- `taskConfigs`: `@IsArray()`, `@ValidateNested({ each: true })`, `@IsOptional()`
- `pauseAfter`: `@IsBoolean()`, `@IsOptional()`
- `TaskNodeConfigInput.order`: `@IsInt()`, `@Min(0)`
- `TaskNodeConfigInput.query`: `@IsString()`, `@IsNotEmpty()`

### 편집 가능 범위

| 상태 | 편집 가능 sequence |
|------|-------------------|
| `INITIALIZED` | 모든 노드 (0부터) |
| 체크포인트 복원 직후 (`restoredToCheckpoint = true`) | `currentWorkIndex`부터 |
| 그 외 `PAUSED` / `AWAITING` | `currentWorkIndex + 1`부터 |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `RUNTIME_NOT_FOUND` | 해당 실행 기록 없음 |
| 400 | `RUNTIME_INVARIANT_VIOLATION` | 편집 불가 상태 또는 편집 불가 sequence |

### 사용 페이지

- [실행 상세](../pages/workflow-run.md) — WorkNodeEditDialog

---

## POST /workflow-runs/:id/work-nodes — Work Node 추가

PAUSED 또는 AWAITING 상태에서만 호출 가능. 마지막 sequence에 추가된다.

### 요청

```
POST /workflow-runs/{id}/work-nodes
Content-Type: application/json
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 워크플로우 실행 ID |

```typescript
interface AddWorkNodeRequest {
  model: string;                       // 필수, 모델명
  taskConfigs: TaskNodeConfigInput[];   // 필수, 최소 1개
  pauseAfter?: boolean;                // 선택
}
```

### 응답

**Status:** `201 Created`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `RUNTIME_NOT_FOUND` | 해당 실행 기록 없음 |
| 400 | `RUNTIME_INVARIANT_VIOLATION` | 편집 불가 상태 |

### 사용 페이지

- [실행 상세](../pages/workflow-run.md) — WorkNodeAddDialog

---

## DELETE /workflow-runs/:id/work-nodes/:sequence — Work Node 삭제

PAUSED 또는 AWAITING 상태에서만 호출 가능. 최소 1개의 Work Node는 남아야 한다.

### 요청

```
DELETE /workflow-runs/{id}/work-nodes/{sequence}
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 워크플로우 실행 ID |
| `sequence` | `number` (정수) | 삭제할 Work Node sequence |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `RUNTIME_NOT_FOUND` | 해당 실행 기록 없음 |
| 400 | `RUNTIME_INVARIANT_VIOLATION` | 편집 불가 상태/sequence 또는 마지막 Work Node 삭제 시도 |

### 사용 페이지

- [실행 상세](../pages/workflow-run.md) — DeleteConfirmDialog

---

## GET /workflow-runs — 실행 목록 조회 (미구현)

### 기대 응답

**Status:** `200 OK`

```typescript
type WorkflowRunListResponse = WorkflowRunListItem[];

interface WorkflowRunListItem {
  id: string;
  workflowId: string;
  workflowName: string;         // JOIN으로 포함
  status: WorkflowRunStatus;
  currentWorkIndex: number;
  totalWorkCount: number;
  createdAt: string;            // ISO 8601
}
```

### 사용 페이지

- [Dashboard](../pages/dashboard.md) — 최근 실행 목록

---

## GET /workflow-runs/summary — 대시보드 요약 (미구현)

### 기대 응답

**Status:** `200 OK`

```typescript
interface RunSummary {
  running: number;
  paused: number;
  awaiting: number;
  completed: number;
  cancelled: number;
  initialized: number;
}
```

### 사용 페이지

- [Dashboard](../pages/dashboard.md) — 요약 카드

---

## 공유 타입 정의

```typescript
type WorkflowRunStatus =
  | 'INITIALIZED'
  | 'RUNNING'
  | 'PAUSED'
  | 'AWAITING'
  | 'COMPLETED'
  | 'CANCELLED';
```
