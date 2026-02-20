# Full-Stack Verify

flow-backend와 flow-front 모두의 코드 품질을 한번에 검증한다.

## 실행

아래 커맨드를 실행하고 결과를 보고한다:

```bash
cd flow-backend && npm run typecheck && npm run test && npm run lint && cd ../flow-front && npx tsc -b && npm run lint && npm run build
```

## 검증 항목

**백엔드:**
1. TypeScript 타입 체크
2. 단위 테스트 (vitest)
3. ESLint

**프론트엔드:**
4. TypeScript 타입 체크
5. ESLint
6. Vite 빌드 검증

## 완료 조건

6개 검증이 모두 에러 없이 통과하면 완료. 실패 시 어느 단계에서 실패했는지 보고한다.
