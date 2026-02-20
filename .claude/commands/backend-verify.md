# Backend Verify

flow-backend의 코드 품질을 검증한다.

## 실행

아래 커맨드를 실행하고 결과를 보고한다:

```bash
cd flow-backend && npm run typecheck && npm run test && npm run lint
```

## 검증 항목

1. **TypeScript 타입 체크** — `tsc --noEmit`
2. **단위 테스트** — `vitest run` (unit + integration + architecture)
3. **ESLint 코드 스타일** — `eslint src tests`

## 완료 조건

3개 커맨드가 모두 에러 없이 통과하면 완료. 실패 시 에러 내용을 보고한다.
