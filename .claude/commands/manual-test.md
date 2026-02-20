# Manual Test Loop

FlowFlow 프로젝트의 수동 테스트 시나리오를 생성하고, 검증하고, 코드를 수정하는 Ralph Loop을 시작합니다.

## 사용법

`manual-test-sc/test-prompt.txt`에 정의된 테스트 프롬프트를 Ralph Loop으로 실행합니다.

## 실행 절차

1. `manual-test-sc/test-prompt.txt`를 읽어 테스트 프롬프트를 확인합니다.
2. 다음 명령으로 Ralph Loop을 시작합니다:

```
/ralph-loop "$(cat manual-test-sc/test-prompt.txt)" --completion-promise "MANUAL TEST COMPLETE" --max-iterations 15
```

## 테스트 대상

6개 도메인에 대한 수동 테스트 시나리오를 생성하고 검증합니다:

- `manual-test-sc/git.md` — Git 저장소 관리 도메인
- `manual-test-sc/mcp-server.md` — MCP 서버 관리 도메인
- `manual-test-sc/workflow.md` — 워크플로우 정의 도메인
- `manual-test-sc/workflow-runtime.md` — 워크플로우 실행 런타임 도메인
- `manual-test-sc/agent-session.md` — 에이전트 세션 관리 도메인
- `manual-test-sc/integration.md` — 프론트엔드-백엔드 통합 검증

## 스크린샷 저장

테스트 중 캡처한 스크린샷은 반드시 `manual-test-sc/screenshots/` 디렉토리에 저장한다.
파일명 형식: `{도메인}-{시나리오번호}.png` (예: `git-01.png`, `workflow-runtime-03.png`)

## 검증 항목

백엔드:
- `npm run typecheck` (타입 체크)
- `npm run test` (단위 테스트)
- `npm run lint` (코드 스타일)

프론트엔드:
- `npx tsc -b` (타입 체크)
- `npm run lint` (코드 스타일)
- `npm run build` (빌드 검증)

## 완료 조건

`manual-test-sc/checklist.md`의 모든 항목이 [x]로 체크되고, 6개 검증 커맨드가 모두 통과하면 완료됩니다.
