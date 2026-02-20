# 테스트 인프라 복구 — Vitest Alias 및 Import 경로 수정

## 실행 커맨드

```
/ralph-loop "loop-save/fix-test-infra.md 파일을 읽고 스펙에 따라 테스트 인프라를 복구하라. 완료되면 promise 태그로 TEST INFRA FIXED를 출력하라." --completion-promise "TEST INFRA FIXED" --max-iterations 10
```

---

## 배경

Vertical Slice 리팩터링 후 vitest.config.ts의 resolve alias가 갱신되지 않았다.
현재 alias는 존재하지 않는 `src/domain/`, `src/application/` 등을 참조하고 있어 **6개 테스트 전체가 import 실패로 실행 불가** 상태다.

### 현재 상태 (vitest.config.ts)

```typescript
// ❌ 이 경로들은 더 이상 존재하지 않음
'@domain': './src/domain',
'@application': './src/application',
'@infrastructure': './src/infrastructure',
'@presentation': './src/presentation',
'@shared': './src/shared',
```

### 테스트 파일 import 패턴 (현재)

```typescript
// tests/unit/domain/workflow-runtime/workflow-run.test.ts
import { WorkflowRun } from '@domain/workflow-runtime/entities/workflow-run.js';
// → @domain이 src/domain/을 가리키나 해당 디렉터리 없음
```

### 현재 tsconfig.json paths (소스용 — 이것이 정답)

```json
"@common/*": ["src/common/*"],
"@workflow/*": ["src/workflow/*"],
"@workflow-runtime/*": ["src/workflow-runtime/*"],
"@git/*": ["src/git/*"],
"@mcp/*": ["src/mcp/*"],
"@agent/*": ["src/agent/*"]
```

---

## 목표

1. vitest.config.ts의 alias를 tsconfig.json paths와 일치시킨다
2. 모든 테스트 파일의 import 경로를 새 alias에 맞게 수정한다
3. 6개 테스트 전체가 통과한다

---

## Phase 1: vitest.config.ts alias 수정

vitest.config.ts의 resolve.alias를 아래로 교체:

```typescript
resolve: {
  alias: {
    '@common': path.resolve(__dirname, './src/common'),
    '@workflow': path.resolve(__dirname, './src/workflow'),
    '@workflow-runtime': path.resolve(__dirname, './src/workflow-runtime'),
    '@git': path.resolve(__dirname, './src/git'),
    '@mcp': path.resolve(__dirname, './src/mcp'),
    '@agent': path.resolve(__dirname, './src/agent'),
    '@tests': path.resolve(__dirname, './tests'),
  },
},
```

## Phase 2: 테스트 import 경로 변환

모든 `tests/**/*.test.ts` 파일에서 import 경로를 변환한다.

### 변환 규칙

| 기존 import | 새 import |
|------------|-----------|
| `@domain/workflow-runtime/entities/...` | `@workflow-runtime/domain/entities/...` |
| `@domain/workflow-runtime/value-objects/...` | `@workflow-runtime/domain/value-objects/...` |
| `@domain/git/entities/...` | `@git/domain/entities/...` |
| `@domain/git/value-objects/...` | `@git/domain/value-objects/...` |
| `@domain/mcp/entities/...` | `@mcp/domain/entities/...` |
| `@domain/mcp/value-objects/...` | `@mcp/domain/value-objects/...` |
| `@common/...` | `@common/...` (유지) |

**패턴**: `@domain/{feature}/{layer}/...` → `@{feature}/domain/{layer}/...`

## Phase 3: 테스트 실행 및 검증

```bash
npm run test
```

When complete:
- vitest.config.ts alias가 tsconfig.json과 일치
- 모든 테스트 파일의 import가 새 vertical slice 경로를 사용
- `npm run test` 실행 시 6개 테스트 파일 전체 통과
- Output: <promise>TEST INFRA FIXED</promise>

---

## 자기 수정 루프

1. vitest.config.ts alias를 수정한다
2. 테스트 import 경로를 일괄 변환한다
3. `npm run test` 실행
4. 실패하는 테스트가 있으면:
   a. 에러 메시지를 분석 (import 오류인지, 로직 오류인지)
   b. import 오류면 경로를 재수정
   c. 로직 오류면 소스코드와 테스트를 비교하여 테스트 수정
5. 모든 테스트 통과할 때까지 3-4 반복
6. 통과하면 `npm run typecheck`도 실행하여 타입 에러 없음 확인

---

## 대상 파일

- `vitest.config.ts`
- `tests/unit/domain/workflow-runtime/workflow-run.test.ts`
- `tests/unit/domain/workflow-runtime/work-execution.test.ts`
- `tests/unit/domain/workflow-runtime/task-execution.test.ts`
- `tests/unit/domain/workflow-runtime/report.test.ts`
- `tests/unit/domain/git/git.test.ts`
- `tests/unit/domain/mcp/mcp-server.test.ts`
