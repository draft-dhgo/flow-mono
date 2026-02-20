# Workflow API

> 소스: `src/workflow/presentation/workflow.controller.ts`

## 엔드포인트 목록

| Method | Path | 설명 | 구현 상태 |
|--------|------|------|-----------|
| `POST` | `/workflows` | 워크플로우 생성 | 구현됨 |
| `PUT` | `/workflows/:id` | 워크플로우 수정 | 구현됨 |
| `DELETE` | `/workflows/:id` | 워크플로우 삭제 | 구현됨 |
| `POST` | `/workflows/:id/activate` | 워크플로우 활성화 | 구현됨 |
| `POST` | `/workflows/:id/deactivate` | 워크플로우 비활성화 | 구현됨 |
| `GET` | `/workflows` | 워크플로우 목록 조회 | **미구현** |
| `GET` | `/workflows/:id` | 워크플로우 상세 조회 | **미구현** |

---

## POST /workflows — 워크플로우 생성

### 요청

```
POST /workflows
Content-Type: application/json
```

```typescript
interface CreateWorkflowRequest {
  name: string;                             // 필수
  description?: string;                     // 선택
  issueKey: string;                         // 필수, 형식: "PROJ-123"
  branchStrategy: string;                   // 필수, 작업 브랜치명 (예: "feature/PROJ-123")
  gitRefs: GitRefInput[];                   // 필수, 최소 1개
  mcpServerRefs?: McpServerRefInput[];      // 선택
  workDefinitions: WorkDefinitionInput[];   // 필수, 최소 1개
}

interface GitRefInput {
  gitId: string;       // 필수, 등록된 Git UUID
  baseBranch: string;  // 필수, 베이스 브랜치명
}

interface McpServerRefInput {
  mcpServerId: string;                  // 필수, 등록된 MCP 서버 UUID
  envOverrides?: Record<string, string>; // 선택, 환경변수 오버라이드
}

interface WorkDefinitionInput {
  order: number;                              // 필수, >= 0
  model: string;                              // 필수, 모델명
  pauseAfter?: boolean;                       // 선택, 기본 false
  gitRefs?: GitRefInput[];                    // 선택, Work 레벨 Git 오버라이드
  mcpServerRefs?: McpServerRefInput[];        // 선택, Work 레벨 MCP 오버라이드
  taskDefinitions: TaskDefinitionInput[];     // 필수, 최소 1개
}

interface TaskDefinitionInput {
  order: number;                          // 필수, >= 0
  query: string;                          // 필수, 비어있지 않은 문자열
  reportOutline?: ReportOutlineInput;     // 선택
}

interface ReportOutlineInput {
  sections: SectionInput[];  // 필수, 최소 1개
}

interface SectionInput {
  title: string;        // 필수
  description: string;  // 필수
}
```

**Validation (DTO):**
- `name`: `@IsString()`, `@IsNotEmpty()`
- `issueKey`: `@IsString()`, `@IsNotEmpty()`
- `branchStrategy`: `@IsString()`, `@IsNotEmpty()`
- `gitRefs`: `@IsArray()`, `@ValidateNested({ each: true })`, `@ArrayMinSize(1)`
- `workDefinitions`: `@IsArray()`, `@ValidateNested({ each: true })`, `@ArrayMinSize(1)`
- 중첩 DTO 모두 `@ValidateNested()` 적용

### 응답

**Status:** `201 Created`

```typescript
interface WorkflowResponse {
  id: string;                               // UUID
  name: string;
  description: string;                      // 미입력 시 빈 문자열
  issueKey: string;
  branchStrategy: { workBranch: string };   // 내부 VO 직렬화
  status: WorkflowStatus;                   // 항상 'DRAFT'로 생성
  gitRefs: GitRefResponse[];
  mcpServerRefs: McpServerRefResponse[];
  workDefinitions: WorkDefinitionResponse[];
}

type WorkflowStatus = 'DRAFT' | 'ACTIVE';

interface GitRefResponse {
  gitId: string;
  baseBranch: string;
  valid: boolean;       // 생성 시 항상 true
}

interface McpServerRefResponse {
  mcpServerId: string;
  envOverrides: Record<string, string>;
  valid: boolean;       // 생성 시 항상 true
}

interface WorkDefinitionResponse {
  order: number;
  model: string;
  pauseAfter: boolean;
  gitRefs: GitRefResponse[];
  mcpServerRefs: McpServerRefResponse[];
  taskDefinitions: TaskDefinitionResponse[];
}

interface TaskDefinitionResponse {
  order: number;
  query: string;
  reportOutline: ReportOutlineResponse | null;
}

interface ReportOutlineResponse {
  sections: SectionResponse[];
}

interface SectionResponse {
  title: string;
  description: string;
}
```

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | 필수 필드 누락 또는 형식 오류 |
| 400 | `WORKFLOW_INVARIANT_VIOLATION` | 이슈 키 형식 오류, 중복 Git 참조 등 |
| 400 | `INVALID_GIT_REFERENCE` | 존재하지 않는 gitId 참조 |
| 400 | `INVALID_MCP_SERVER_REFERENCE` | 존재하지 않는 mcpServerId 참조 |

### 사용 페이지

- [Workflow 관리](../pages/workflow-management.md) — 생성 폼 제출

---

## PUT /workflows/:id — 워크플로우 수정

### 요청

```
PUT /workflows/{id}
Content-Type: application/json
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 수정할 워크플로우 ID |

```typescript
interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  workDefinitions?: WorkDefinitionInput[];     // 전체 교체
  gitRefs?: GitRefInput[];                     // 전체 교체
  mcpServerRefs?: McpServerRefInput[];         // 전체 교체
}
```

**참고:** `issueKey`, `branchStrategy`는 수정 불가 (불변 필드).

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `WORKFLOW_NOT_FOUND` | 해당 ID의 워크플로우 없음 |
| 400 | `WORKFLOW_INVALID_STATE_TRANSITION` | ACTIVE 상태에서 수정 시도 |
| 400 | `INVALID_GIT_REFERENCE` | 존재하지 않는 gitId 참조 |
| 400 | `INVALID_MCP_SERVER_REFERENCE` | 존재하지 않는 mcpServerId 참조 |

### 사용 페이지

- [Workflow 관리](../pages/workflow-management.md) — 수정 폼 제출 (DRAFT에서만)

---

## DELETE /workflows/:id — 워크플로우 삭제

### 요청

```
DELETE /workflows/{id}
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 삭제할 워크플로우 ID |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `WORKFLOW_NOT_FOUND` | 해당 ID의 워크플로우 없음 |
| 400 | `WORKFLOW_INVALID_STATE_TRANSITION` | ACTIVE 상태에서 삭제 시도 |

### 사용 페이지

- [Workflow 관리](../pages/workflow-management.md) — 삭제 확인 다이얼로그 (DRAFT에서만)

---

## POST /workflows/:id/activate — 워크플로우 활성화

### 요청

```
POST /workflows/{id}/activate
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 활성화할 워크플로우 ID |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `WORKFLOW_NOT_FOUND` | 해당 ID의 워크플로우 없음 |
| 400 | `WORKFLOW_INVALID_STATE_TRANSITION` | 이미 ACTIVE 상태 |
| 400 | `WORKFLOW_INVARIANT_VIOLATION` | 유효하지 않은(invalid) Git/MCP 참조 존재 시 활성화 거부 |

### 사용 페이지

- [Workflow 관리](../pages/workflow-management.md) — DRAFT 워크플로우의 "활성화" 액션

---

## POST /workflows/:id/deactivate — 워크플로우 비활성화

### 요청

```
POST /workflows/{id}/deactivate
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 비활성화할 워크플로우 ID |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 404 | `WORKFLOW_NOT_FOUND` | 해당 ID의 워크플로우 없음 |
| 400 | `WORKFLOW_INVALID_STATE_TRANSITION` | 이미 DRAFT 상태 |

### 사용 페이지

- [Workflow 관리](../pages/workflow-management.md) — ACTIVE 워크플로우의 "비활성화" 액션

---

## GET /workflows — 워크플로우 목록 조회 (미구현)

프론트엔드 구현을 위해 추가가 필요한 API.

### 기대 응답

**Status:** `200 OK`

```typescript
type WorkflowListResponse = WorkflowListItem[];

interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  issueKey: string;
  status: WorkflowStatus;
  branchStrategy: string;       // workBranch 값
  gitRefCount: number;
  mcpServerRefCount: number;
  workDefinitionCount: number;
}
```

### 사용 페이지

- [Workflow 관리](../pages/workflow-management.md) — 목록 페이지
- [Dashboard](../pages/dashboard.md) — 새 실행 시 워크플로우 선택
- [Git 관리](../pages/git-management.md) — 삭제 시 참조 워크플로우 조회
- [MCP 서버 관리](../pages/mcp-server-management.md) — 삭제 시 참조 워크플로우 조회

---

## GET /workflows/:id — 워크플로우 상세 조회 (미구현)

### 기대 응답

**Status:** `200 OK`

```typescript
// WorkflowResponse와 동일 (POST 응답 참조)
```

### 사용 페이지

- [Workflow 관리](../pages/workflow-management.md) — 수정 폼 초기값 로드

---

## 공유 타입 정의

```typescript
type WorkflowStatus = 'DRAFT' | 'ACTIVE';
```
