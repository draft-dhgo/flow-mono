# MCP Server API

> 소스: `src/mcp/presentation/mcp.controller.ts`

## 엔드포인트 목록

| Method | Path | 설명 | 구현 상태 |
|--------|------|------|-----------|
| `POST` | `/mcp-servers` | MCP 서버 등록 | 구현됨 |
| `DELETE` | `/mcp-servers/:id` | MCP 서버 해제 | 구현됨 |
| `GET` | `/mcp-servers` | MCP 서버 목록 조회 | **미구현** |
| `GET` | `/mcp-servers/:id` | MCP 서버 상세 조회 | **미구현** |

---

## POST /mcp-servers — MCP 서버 등록

### 요청

```
POST /mcp-servers
Content-Type: application/json
```

```typescript
interface RegisterMcpServerRequest {
  name: string;                        // 필수, 서버 이름
  command: string;                     // 필수, 실행 명령어
  args?: string[];                     // 선택, 명령어 인자 배열
  env?: Record<string, string>;        // 선택, 환경변수 키-값 맵
  transportType: McpTransportType;     // 필수, 트랜스포트 타입
  url?: string | null;                 // 조건부, SSE/STREAMABLE_HTTP일 때 필수
}

type McpTransportType = 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';
```

**Validation:**
- `name`: `@IsString()`, `@IsNotEmpty()`
- `command`: `@IsString()`, `@IsNotEmpty()`
- `args`: `@IsArray()`, `@IsString({ each: true })` (선택)
- `env`: `@IsObject()` (선택)
- `transportType`: `@IsEnum(McpTransportType)`
- `url`: `@IsString()` (선택)

**도메인 제약 조건:**
- `transportType === 'STDIO'`이면 `url`은 null이어야 함
- `transportType === 'SSE' | 'STREAMABLE_HTTP'`이면 `url`은 필수

### 응답

**Status:** `201 Created`

```typescript
interface McpServerResponse {
  id: string;                          // UUID
  name: string;
  command: string;
  args: string[];                      // 빈 배열 가능
  env: Record<string, string>;         // 빈 객체 가능
  transportType: McpTransportType;
  url: string | null;
}
```

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | 필수 필드 누락 또는 형식 오류 |
| 400 | `MCP_SERVER_INVARIANT_VIOLATION` | STDIO에서 url 설정 또는 SSE에서 url 미설정 |

### 사용 페이지

- [MCP 서버 관리](../pages/mcp-server-management.md) — 등록 다이얼로그에서 호출

---

## DELETE /mcp-servers/:id — MCP 서버 해제

### 요청

```
DELETE /mcp-servers/{id}
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 해제할 MCP 서버 ID |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 | 메시지 패턴 |
|--------|------|------|-------------|
| 404 | `MCP_SERVER_NOT_FOUND` | 해당 ID의 MCP 서버 없음 | `"McpServer not found: {id}"` |
| 400 | `MCP_SERVER_REFERENCED_BY_WORKFLOW` | 워크플로우가 참조 중이라 해제 차단 | `"MCP server {id} is referenced by workflows: [{workflowIds}]. Remove workflow references before unregistering."` |

**참고:** `MCP_SERVER_REFERENCED_BY_WORKFLOW` 에러 응답에는 참조 중인 `workflowIds` 배열이 포함된다.

### 사용 페이지

- [MCP 서버 관리](../pages/mcp-server-management.md) — 해제 다이얼로그에서 호출 (refCount === 0일 때만)

---

## GET /mcp-servers — MCP 서버 목록 조회 (미구현)

프론트엔드 구현을 위해 추가가 필요한 API.

### 기대 응답

**Status:** `200 OK`

```typescript
type McpServerListResponse = McpServerResponse[];
```

### 사용 페이지

- [MCP 서버 관리](../pages/mcp-server-management.md) — 페이지 로드 시 목록
- [Workflow 관리](../pages/workflow-management.md) — MCP 서버 참조 드롭다운 옵션

---

## GET /mcp-servers/:id — MCP 서버 상세 조회 (미구현)

### 기대 응답

**Status:** `200 OK`

```typescript
interface McpServerResponse {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  transportType: McpTransportType;
  url: string | null;
}
```

### 사용 페이지

- [Workflow 관리](../pages/workflow-management.md) — 수정 폼에서 MCP 참조 표시

---

## 공유 타입 정의

```typescript
type McpTransportType = 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';

interface McpServerResponse {
  id: string;                      // UUID v4
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  transportType: McpTransportType;
  url: string | null;              // STDIO일 때 null
}
```
