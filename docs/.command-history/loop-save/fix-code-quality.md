# 코드 품질 수정 — ESLint 에러 제거 + as any 제거

## 실행 커맨드

```
/ralph-loop "loop-save/fix-code-quality.md 파일을 읽고 스펙에 따라 코드 품질 이슈를 수정하라. 완료되면 promise 태그로 CODE QUALITY FIXED를 출력하라." --completion-promise "CODE QUALITY FIXED" --max-iterations 10
```

---

## 배경

현재 `npm run lint` 결과: **4 errors, 3 warnings**. 미사용 import, 정규식 제어 문자, `as any` 강제 캐스팅 등의 문제가 존재한다.

---

## Phase 1: 미사용 import 제거

### 1-1. `src/common/ports/workflow-config-reader.ts`

```typescript
// ❌ GitId가 import되었으나 사용되지 않음
import type { WorkflowId, GitId, McpServerId } from '../ids/index.js';
// ✅ GitId 제거
import type { WorkflowId, McpServerId } from '../ids/index.js';
```

단, 파일 내에서 `GitId`가 실제로 사용되는지 **먼저 확인**. interface 정의나 타입에서 쓰이는지 전체 파일을 읽고 판단하라.
만약 `McpServerId`도 사용되지 않으면 함께 제거.

### 1-2. `src/workflow-runtime/application/event-handlers/query-responded-handler.ts`

```typescript
// ❌ EventPublisher가 import되었으나 사용되지 않음
import type { WorkExecutionRepository, EventPublisher, WorkExecutionId } from '../../domain/index.js';
// ✅ EventPublisher 제거
import type { WorkExecutionRepository, WorkExecutionId } from '../../domain/index.js';
```

---

## Phase 2: 정규식 수정 — branch-name.ts

### 파일: `src/workflow/domain/value-objects/branch-name.ts`

현재 문제:
```typescript
// ❌ ESLint: no-control-regex (제어 문자 직접 포함) + no-useless-escape (\[ 불필요 이스케이프)
/[\x00-\x1f\x7f ~^:?*\[\\]/
```

수정 방향:
- 제어 문자 범위를 ESLint가 허용하는 방식으로 변환 (유니코드 이스케이프 `\u0000-\u001f` 사용 또는 eslint-disable 주석)
- `\[`의 불필요 이스케이프를 제거 (문자 클래스 안에서 `[`는 이스케이프 불필요하므로 제거하거나, 필요하면 올바르게 처리)

**주의**: Git branch name 검증 로직의 정확성은 유지해야 한다. 정규식 의미를 변경하지 말고 ESLint 규칙만 만족시킬 것.

수정 예시:
```typescript
// ✅ 제어 문자를 유니코드 표기로, 불필요 이스케이프 제거
// eslint-disable-next-line no-control-regex
/[\u0000-\u001f\x7f ~^:?*[\\]/
```

또는 더 명시적으로:
```typescript
const CONTROL_CHAR_OR_SPECIAL = /[\u0000-\u001f\u007f ~^:?*[\\]/;
```

---

## Phase 3: `as any` 캐스팅 제거 — StartWorkflowRunUseCase

### 파일: `src/workflow-runtime/application/use-cases/start-workflow-run-use-case.ts`

현재 문제 (63-64줄):
```typescript
const report = Report.create({
  taskExecutionId: '' as any,    // ← Branded Type 위반
  workExecutionId: '' as any,    // ← Branded Type 위반
  workflowRunId: run.id,
  outline: runtimeOutline,
});
```

**원인 분석**: Report를 생성하는 시점에 TaskExecution과 WorkExecution이 아직 생성되지 않아 ID를 알 수 없음.

**해결 전략** (택 1, 상황에 맞게 판단):

### 전략 A: 생성 순서 변경
WorkExecution → TaskExecution을 먼저 생성한 후 Report를 생성.
- WorkExecution.create()가 내부적으로 TaskExecution을 생성하므로, 생성 후 task ID를 꺼내서 Report에 전달

### 전략 B: Report가 taskExecutionId를 나중에 바인딩
Report.create()에서 taskExecutionId와 workExecutionId를 optional로 만들고, 이후 bind 메서드로 연결.
- 단, 이 방식은 도메인 모델의 불변성을 해치므로 **비권장**

### 전략 C: Report 생성을 WorkExecution 생성 이후로 이동
WorkExecution을 먼저 생성하고, 그 안의 TaskExecution ID를 사용하여 Report를 생성.

```typescript
// ✅ 전략 C 예시
const we = WorkExecution.create({ ... taskProps });
// we.taskExecutions에서 reportId가 필요한 task를 찾아 Report 생성
for (const task of we.taskExecutions) {
  if (task.requiresReport()) {
    const report = Report.create({
      taskExecutionId: task.id,
      workExecutionId: we.id,
      workflowRunId: run.id,
      outline: runtimeOutline,
    });
    reports.push(report);
  }
}
```

**선택 기준**: 소스코드의 WorkExecution.create()와 TaskExecution의 구조를 먼저 읽고, 어느 전략이 최소 변경으로 `as any`를 제거할 수 있는지 판단하라.

`model` 캐스팅(`as unknown as string`)도 같은 파일에 있으면 함께 수정.

---

## Phase 4: 테스트 파일의 any 경고 수정

### 파일: `tests/unit/domain/workflow-runtime/workflow-run.test.ts` (213줄 근처)

현재 문제:
```typescript
// ❌ @typescript-eslint/no-explicit-any
someValue as any
```

구체적인 타입으로 교체하거나, 테스트에서 의도적인 잘못된 값 주입이라면 `// eslint-disable-next-line` 사용.

---

## 완료 조건

- `npm run lint` 실행 시 **0 errors, 0 warnings**
- `npm run typecheck` 통과 (0 errors)
- `npm run test` 통과 (기존 테스트가 깨지지 않음 — 만약 테스트가 아직 경로 문제로 실패한다면 lint/typecheck만 통과하면 됨)
- `as any` 캐스팅이 소스코드(src/)에서 완전히 제거됨
- Output: <promise>CODE QUALITY FIXED</promise>

---

## 자기 수정 루프

1. 미사용 import를 제거한다
2. branch-name.ts 정규식을 수정한다
3. `npm run lint` 실행
4. 에러가 남아있으면 에러 메시지를 분석하여 재수정
5. StartWorkflowRunUseCase의 `as any`를 제거한다
   a. 관련 엔티티(WorkExecution, TaskExecution, Report)의 create 시그니처를 먼저 읽는다
   b. 최소 변경 전략을 선택한다
   c. 수정 후 `npm run typecheck` 실행
   d. 타입 에러가 나면 수정
6. 테스트 파일의 any 경고를 수정한다
7. `npm run lint` + `npm run typecheck` 모두 통과할 때까지 반복

---

## 대상 파일

- `src/common/ports/workflow-config-reader.ts`
- `src/workflow-runtime/application/event-handlers/query-responded-handler.ts`
- `src/workflow/domain/value-objects/branch-name.ts`
- `src/workflow-runtime/application/use-cases/start-workflow-run-use-case.ts`
- `tests/unit/domain/workflow-runtime/workflow-run.test.ts`
