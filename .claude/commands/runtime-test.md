# Runtime Test

flow-backend의 실제 런타임을 API 호출로 검증한다.

## 실행 절차

1. `flow-backend/tests/manual/runtime-test.prompt.md` 파일을 읽는다.
2. 파일에 정의된 모든 단계를 순서대로 실행한다.
3. 각 단계의 검증 조건을 확인한다.
4. 테스트 결과 리포트를 파일 하단의 표 형식으로 출력한다.

## 주의 사항

- 이전 단계에서 반환된 ID(`gitId`, `mcpServerId`, `workflowId`, `workflowRunId`)를 이후 단계에서 정확히 대입하라.
- 실패한 단계가 있으면 해당 단계에서 멈추지 말고, 가능한 범위까지 계속 진행한 후 전체 결과를 보고하라.
- 서버 시작 실패나 빌드 실패도 테스트 실패로 보고하라.
- 테스트 완료 후 반드시 서버를 종료하고 `/tmp/manual-test-repo`를 정리하라.
