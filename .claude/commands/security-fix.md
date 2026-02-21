# Security Fix

보안 점검에서 발견된 취약점을 단계별로 수정한다.

## 수정 대상 (우선순위순)

### CRITICAL

1. **execSync Command Injection 제거**
   - `flow-backend/src/common/utils/platform.ts` 의 `resolveExecutablePath()`
   - `execSync(`which ${name}`)` → `execFileSync('which', [name])` 로 변경
   - Windows: `execFileSync('where', [name])` 로 변경

2. **전역 catch-all Exception Filter 추가**
   - `flow-backend/src/common/presentation/filters/` 에 `all-exceptions.filter.ts` 생성
   - `@Catch()` (인자 없음) 로 모든 미처리 예외 캐치
   - 서버 로그에 전체 에러 기록, 클라이언트에는 `{ code: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다' }` 만 반환
   - `shared.module.ts`에 등록

### HIGH

3. **MCP 서버 command 화이트리스트**
   - `flow-backend/src/mcp/domain/` 에 command 검증 로직 추가
   - 허용 커맨드 예시: `npx`, `node`, `python`, `uvx`, `docker`
   - 절대경로가 아닌 경우 path traversal 패턴 (`..`, `/`) 차단

4. **Git URL SSRF 방어**
   - `flow-backend/src/git/domain/value-objects/git-url.ts` 에 내부 IP 차단 로직 추가
   - 차단 대역: `127.x`, `10.x`, `172.16-31.x`, `192.168.x`, `169.254.x`, `0.0.0.0`
   - `localhost`, `[::1]` 도 차단

5. **Git Argument Injection 방어**
   - `flow-backend/src/git/infra/cli-git-client.ts` 의 모든 `execFile` 호출에서
   - 사용자 입력 인자 앞에 `'--'` 구분자 추가
   - 예: `['clone', '--', url, path]`

6. **MCP 환경변수 API 응답 마스킹**
   - `flow-backend/src/mcp/application/queries/` 의 list/get 쿼리에서
   - `env` 값을 마스킹: 앞 3글자만 표시 + `****` (예: `sk-****`)
   - 워크플로우/런 쿼리의 `envOverrides` 도 동일 처리

7. **Rate Limiting 추가**
   - `npm install @nestjs/throttler`
   - `app.module.ts`에 `ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100 }] })` 추가
   - 전역 `ThrottlerGuard` 등록
   - 에이전트 세션 생성 엔드포인트는 더 엄격한 제한 적용 (`@Throttle({ default: { ttl: 60000, limit: 5 } })`)

### MEDIUM

8. **Helmet 보안 헤더 추가**
   - `npm install helmet`
   - `main.ts`에 `app.use(helmet())` 추가

9. **CORS 설정**
   - `main.ts`에 `app.enableCors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' })` 추가

10. **Swagger 프로덕션 비활성**
    - `main.ts`에서 Swagger 설정을 `if (process.env.NODE_ENV !== 'production')` 로 감싸기

11. **ValidationPipe 강화**
    - `main.ts`의 `ValidationPipe`에 `forbidNonWhitelisted: true` 추가

12. **localPath / workspacePath 경로 검증 강화**
    - `git-repo-path-factory.ts`의 `resolve()`에 `startsWith(basePath)` 검증 추가
    - 절대경로 입력 차단 또는 basePath 내부로 제한

13. **deleteRepo 경로 검증**
    - `cli-git-client.ts`의 `deleteRepo()`에서 삭제 전 basePath 내부 경로인지 검증

### LOW

14. **DB 기본 비밀번호 제거**
    - `database.config.ts`에서 `USE_DB=true` 일 때 `DB_PASSWORD` 미설정 시 에러 throw

15. **프론트엔드 에러 메시지 매핑**
    - `flow-front/src/api/client.ts`에서 에러 코드별 사용자 친화적 메시지 매핑 추가

16. **MCP 환경변수 입력 마스킹**
    - `McpServerManagementPage.tsx`의 env value Input에 `type="password"` 추가

17. **루트 .gitignore에 .env 패턴 추가**
    - `.env`, `.env.*`, `!.env.example` 패턴 추가

## 수정 절차

각 항목을 순서대로 수정하며:
1. 수정 전 해당 파일을 읽고 현재 코드를 확인한다
2. 최소한의 변경으로 취약점을 해결한다
3. 기존 아키텍처 패턴(DDD + Hexagonal)을 준수한다
4. 새 파일 생성 시 기존 파일과 동일한 코딩 컨벤션을 따른다

## 수정 후 검증

모든 수정 완료 후 아래 커맨드로 검증한다:

```bash
cd flow-backend && npm run typecheck && npm run test && npm run lint && cd ../flow-front && npx tsc -b && npm run lint && npm run build
```

## 완료 조건

- 모든 수정 항목이 적용됨
- 타입체크, 테스트, 린트가 모두 통과
- 기존 기능이 깨지지 않음
