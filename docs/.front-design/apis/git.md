# Git API

> 소스: `src/git/presentation/git.controller.ts`

## 엔드포인트 목록

| Method | Path | 설명 | 구현 상태 |
|--------|------|------|-----------|
| `POST` | `/gits` | Git 저장소 등록 | 구현됨 |
| `DELETE` | `/gits/:id` | Git 저장소 삭제 | 구현됨 |
| `GET` | `/gits` | Git 저장소 목록 조회 | **미구현** |
| `GET` | `/gits/:id` | Git 저장소 상세 조회 | **미구현** |

---

## POST /gits — Git 저장소 등록

### 요청

```
POST /gits
Content-Type: application/json
```

```typescript
interface CreateGitRequest {
  url: string;       // 필수, 비어있지 않은 Git URL
  localPath: string; // 필수, 비어있지 않은 로컬 경로
}
```

**Validation:**
- `url`: `@IsString()`, `@IsNotEmpty()`
- `localPath`: `@IsString()`, `@IsNotEmpty()`

### 응답

**Status:** `201 Created`

```typescript
interface GitResponse {
  id: string;        // UUID
  url: string;       // 등록된 Git URL
  localPath: string; // 로컬 경로
}
```

### 에러

| Status | Code | 원인 |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | 필수 필드 누락 또는 형식 오류 |
| 400 | `GIT_INVARIANT_VIOLATION` | 유효하지 않은 Git URL 형식 |
| 409 | `GIT_CREATION_ERROR` | 이미 동일 URL로 등록된 저장소 존재 |

### 사용 페이지

- [Git 관리](../pages/git-management.md) — 등록 다이얼로그에서 호출

---

## DELETE /gits/:id — Git 저장소 삭제

### 요청

```
DELETE /gits/{id}
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` (UUID) | 삭제할 Git 저장소 ID |

### 응답

**Status:** `200 OK`

응답 본문 없음.

### 에러

| Status | Code | 원인 | 메시지 패턴 |
|--------|------|------|-------------|
| 404 | `GIT_NOT_FOUND` | 해당 ID의 Git 저장소 없음 | `"Git not found: {id}"` |
| 400 | `GIT_REFERENCED_BY_WORKFLOW` | 워크플로우가 참조 중이라 삭제 차단 | `"Git repository {id} is referenced by workflows: [{workflowIds}]. Remove workflow references before deleting."` |

**참고:** `GIT_REFERENCED_BY_WORKFLOW` 에러 응답에는 참조 중인 `workflowIds` 배열이 포함된다. 프론트엔드는 이 정보를 파싱하여 차단 다이얼로그에 표시할 수 있다.

### 사용 페이지

- [Git 관리](../pages/git-management.md) — 삭제 다이얼로그에서 호출 (refCount === 0일 때만)

---

## GET /gits — Git 저장소 목록 조회 (미구현)

프론트엔드 구현을 위해 추가가 필요한 API.

### 기대 응답

**Status:** `200 OK`

```typescript
type GitListResponse = GitResponse[];

interface GitResponse {
  id: string;
  url: string;
  localPath: string;
}
```

### 사용 페이지

- [Git 관리](../pages/git-management.md) — 페이지 로드 시 목록
- [Workflow 관리](../pages/workflow-management.md) — Git 참조 드롭다운 옵션

---

## GET /gits/:id — Git 저장소 상세 조회 (미구현)

### 기대 응답

**Status:** `200 OK`

```typescript
interface GitResponse {
  id: string;
  url: string;
  localPath: string;
}
```

### 사용 페이지

- [Workflow 관리](../pages/workflow-management.md) — 수정 폼에서 Git 참조 표시

---

## 공유 타입 정의

```typescript
// Git 엔티티 응답 타입 (모든 GET/POST 응답에서 사용)
interface GitResponse {
  id: string;        // UUID v4
  url: string;       // Git URL (https, git, ssh, git@ 형식)
  localPath: string; // 절대 경로
}
```
