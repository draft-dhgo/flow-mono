# Frontend Verify

flow-front의 코드 품질을 검증한다.

## 실행

아래 커맨드를 실행하고 결과를 보고한다:

```bash
cd flow-front && npx tsc -b && npm run lint && npm run build
```

## 검증 항목

1. **TypeScript 타입 체크** — `tsc -b`
2. **ESLint 코드 스타일** — `eslint`
3. **Vite 빌드 검증** — `vite build`

## 완료 조건

3개 커맨드가 모두 에러 없이 통과하면 완료. 실패 시 에러 내용을 보고한다.
