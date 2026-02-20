# 수동 런타임 테스트 프롬프트

아래 절차를 순서대로 실행하여 workflow-backend의 실제 런타임을 검증하라.
서버는 http://localhost:3000 에서 동작한다.

## 사전 조건

- `git` CLI가 설치되어 있어야 한다.
- Claude Code CLI가 설치되어 있어야 한다 (OAuth 로그인 완료 상태).

---

## Phase A: 서버 빌드 및 리소스 등록

### A-1. 서버 빌드 및 시작

```bash
npm run build && npm run start
```

서버가 정상적으로 시작 로그를 출력하는지 확인하라.
서버를 백그라운드로 실행하고 이후 테스트를 진행하라.

### A-2. Git 리포지토리 등록

실제 git clone이 수행된다. 작은 공개 리포를 사용하라.

```bash
curl -s -X POST http://localhost:3000/gits \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://github.com/octocat/Hello-World.git",
    "localPath": "/tmp/manual-test-repo"
  }'
```

**검증:**
- 응답에 `gitId`가 포함되어야 한다.
- `/tmp/manual-test-repo` 디렉토리가 실제로 존재하고 `.git` 폴더가 있어야 한다.
- 반환된 `gitId`를 기록하라 (이후 단계에서 `<GIT_ID>`로 사용).

### A-3. MCP 서버 등록

```bash
curl -s -X POST http://localhost:3000/mcp-servers \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "test-mcp",
    "command": "node",
    "args": ["server.js"],
    "env": {"PORT": "4000"},
    "transportType": "STDIO"
  }'
```

**검증:**
- 응답에 `mcpServerId`가 포함되어야 한다.
- 반환된 `mcpServerId`를 기록하라 (`<MCP_SERVER_ID>`).

### A-4. Workflow 생성

`<GIT_ID>`를 A-2에서 받은 실제 값으로 교체하라.
Work Definition을 3개 구성하여, 이후 Phase B에서 work node CRUD 및 상태 전이를 충분히 검증할 수 있게 한다.

```bash
curl -s -X POST http://localhost:3000/workflows \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Manual Test Workflow",
    "issueKey": "TEST-1",
    "branchStrategy": "feature/manual-test",
    "workDefinitions": [
      {
        "order": 0,
        "model": "claude-sonnet-4-5-20250929",
        "taskDefinitions": [
          {"order": 0, "query": "Analyze the repository structure"}
        ],
        "gitRefs": [{"gitId": "<GIT_ID>", "baseBranch": "master"}]
      },
      {
        "order": 1,
        "model": "claude-sonnet-4-5-20250929",
        "taskDefinitions": [
          {"order": 0, "query": "List all branches in the repository"}
        ],
        "gitRefs": [{"gitId": "<GIT_ID>", "baseBranch": "master"}]
      },
      {
        "order": 2,
        "model": "claude-sonnet-4-5-20250929",
        "taskDefinitions": [
          {"order": 0, "query": "Summarize the README file"}
        ],
        "gitRefs": [{"gitId": "<GIT_ID>", "baseBranch": "master"}]
      }
    ],
    "gitRefs": [{"gitId": "<GIT_ID>", "baseBranch": "master"}]
  }'
```

**검증:**
- 응답에 `workflowId`가 포함되어야 한다.
- 반환된 `workflowId`를 기록하라 (`<WORKFLOW_ID>`).

---

## Phase B: 워크플로우 실행 라이프사이클

### B-1. 기본 실행

#### B-1a. Workflow 활성화

Workflow는 DRAFT 상태로 생성된다. 실행하려면 먼저 ACTIVE로 활성화해야 한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflows/<WORKFLOW_ID>/activate
```

**검증:**
- 200 응답.

#### B-1b. Workflow Run 시작

활성화된 Workflow에 대해 실행을 시작한다.

```bash
curl -s -X POST http://localhost:3000/workflow-runs \
  -H 'Content-Type: application/json' \
  -d '{
    "workflowId": "<WORKFLOW_ID>"
  }'
```

**검증:**
- 응답에 `workflowRunId`가 포함되어야 한다.
- 응답의 `status`가 `"RUNNING"`이어야 한다.
- 반환된 `workflowRunId`를 기록하라 (`<RUN_ID>`).

**파일시스템 검증 (Run 시작 시 생성되는 아티팩트):**

```bash
# WorkflowSpace 디렉토리가 생성되었는지 확인
ls /tmp/workflow-spaces/<RUN_ID>/

# WorkTree (git worktree)가 생성되었는지 확인
ls /tmp/workflow-spaces/<RUN_ID>/work-trees/<GIT_ID>/.git
```

- `/tmp/workflow-spaces/<RUN_ID>/` 디렉토리가 존재해야 한다.
- `/tmp/workflow-spaces/<RUN_ID>/work-trees/<GIT_ID>/.git` 가 존재해야 한다 (git worktree 완료, .git은 파일로 존재).

### B-2. 실행 중 방어 테스트

> **타이밍 주의:** B-1b 직후, 에이전트가 작업을 완료하기 전에 즉시 실행해야 한다.

RUNNING 상태에서 현재 실행 중인 sequence 0 노드를 수정하려고 시도한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X PUT http://localhost:3000/workflow-runs/<RUN_ID>/work-nodes/0 \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "taskConfigs": [
      {"order": 0, "query": "Should not be editable while running"}
    ]
  }'
```

**검증:**
- 4xx 에러 응답 (RUNNING 상태에서 실행 중인 work node는 수정 불가).

### B-3. 일시정지 중 편집

#### B-3a. Workflow Run 일시정지

> **타이밍 주의:** B-2 직후 즉시 실행하여, 에이전트가 모든 work node를 완료하기 전에 일시정지시킨다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<RUN_ID>/pause
```

**검증:**
- 200 또는 202 응답.

#### B-3b. 기존 Work Node 수정

일시정지 상태에서 편집 가능한 기존 work node를 수정한다.
Workflow에 3개 노드(sequence 0, 1, 2)가 있고, pause 후 currentWorkIndex=0이므로 sequence 1 이상이 편집 가능하다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X PUT http://localhost:3000/workflow-runs/<RUN_ID>/work-nodes/1 \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "taskConfigs": [
      {"order": 0, "query": "List all branches and tags in the repository"}
    ],
    "pauseAfter": true
  }'
```

**검증:**
- 200 또는 202 응답.

#### B-3c. Work Node 추가

일시정지 상태에서 새 작업 노드를 추가한다 (sequence 3에 추가됨).

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<RUN_ID>/work-nodes \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "taskConfigs": [
      {"order": 0, "query": "Write a final summary of all findings"}
    ],
    "pauseAfter": false
  }'
```

**검증:**
- 200 또는 202 응답.

#### B-3d. Work Node 삭제

추가한 작업 노드(마지막 sequence)를 삭제한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X DELETE http://localhost:3000/workflow-runs/<RUN_ID>/work-nodes/3
```

**검증:**
- 200 또는 202 응답.

### B-4. 취소 및 삭제

#### B-4a. Workflow Run 취소

일시정지 상태에서 워크플로우를 취소한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<RUN_ID>/cancel \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "Manual test cancellation"
  }'
```

**검증:**
- 200 또는 202 응답.

**파일시스템 검증 (종료 이벤트에 의한 자동 정리):**

취소 시 `WorkflowRunTerminatedHandler`가 WorkTree와 WorkflowSpace를 자동 삭제한다.

```bash
# WorkflowSpace 디렉토리가 삭제되었는지 확인 (실패해야 정상)
ls /tmp/workflow-spaces/<RUN_ID>/
```

- `/tmp/workflow-spaces/<RUN_ID>/` 디렉토리가 존재하지 않아야 한다.

#### B-4b. 취소된 Run 재취소 방어

이미 취소된 워크플로우를 다시 취소하면 에러가 발생해야 한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<RUN_ID>/cancel \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "Should fail"
  }'
```

**검증:**
- 4xx 에러 응답 (이미 종료 상태이므로 취소 불가).

#### B-4c. Workflow Run 삭제

종료된(CANCELLED) 워크플로우 런을 삭제한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X DELETE http://localhost:3000/workflow-runs/<RUN_ID>
```

**검증:**
- 200 또는 204 응답.

#### B-4d. 삭제된 Run 재삭제 방어

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X DELETE http://localhost:3000/workflow-runs/<RUN_ID>
```

**검증:**
- 404 응답 (이미 삭제됨).

---

## Phase C: AWAITING 상태 검증 (pauseAfter)

이 Phase는 `pauseAfter` 설정에 의해 work 완료 후 AWAITING 상태로 전이되고, resume 시 다음 work가 실행되는 흐름을 검증한다.

### C-1. Workflow 준비

#### C-1a. Workflow 생성

3개의 Work Definition을 가진 Workflow를 생성한다. 첫 번째 Work에 `pauseAfter: true`를 설정하여, 첫 작업 완료 후 AWAITING 상태가 되게 한다.

```bash
curl -s -X POST http://localhost:3000/workflows \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "AWAITING Test Workflow",
    "issueKey": "TEST-2",
    "branchStrategy": "feature/awaiting-test",
    "workDefinitions": [
      {
        "order": 0,
        "model": "claude-sonnet-4-5-20250929",
        "pauseAfter": true,
        "taskDefinitions": [
          {"order": 0, "query": "List the files in the repository root directory"}
        ],
        "gitRefs": [{"gitId": "<GIT_ID>", "baseBranch": "master"}]
      },
      {
        "order": 1,
        "model": "claude-sonnet-4-5-20250929",
        "taskDefinitions": [
          {"order": 0, "query": "Read the README.md file and summarize it"}
        ],
        "gitRefs": [{"gitId": "<GIT_ID>", "baseBranch": "master"}]
      },
      {
        "order": 2,
        "model": "claude-sonnet-4-5-20250929",
        "taskDefinitions": [
          {"order": 0, "query": "List all branches in the repository"}
        ],
        "gitRefs": [{"gitId": "<GIT_ID>", "baseBranch": "master"}]
      }
    ],
    "gitRefs": [{"gitId": "<GIT_ID>", "baseBranch": "master"}]
  }'
```

**검증:**
- 응답에 `workflowId`가 포함되어야 한다.
- 반환된 `workflowId`를 기록하라 (`<CP_WORKFLOW_ID>`).

#### C-1b. Workflow 활성화

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflows/<CP_WORKFLOW_ID>/activate
```

**검증:**
- 200 응답.

#### C-1c. Workflow Run 시작

```bash
curl -s -X POST http://localhost:3000/workflow-runs \
  -H 'Content-Type: application/json' \
  -d '{
    "workflowId": "<CP_WORKFLOW_ID>"
  }'
```

**검증:**
- 응답에 `workflowRunId`가 포함되어야 한다.
- 반환된 `workflowRunId`를 기록하라 (`<CP_RUN_ID>`).

### C-2. AWAITING 전이 검증

#### C-2a. 실행 상태 폴링 (AWAITING 대기)

첫 번째 Work의 `pauseAfter: true` 설정에 의해, 첫 작업 완료 후 **AWAITING** 상태가 된다.
5초 간격으로 폴링하여 상태를 확인하라. 최대 120초까지 대기한다.

```bash
curl -s http://localhost:3000/workflow-runs/<CP_RUN_ID>
```

**검증:**
- 응답의 `status`가 `"AWAITING"`이 될 때까지 반복 조회.
- 120초 내에 AWAITING 상태가 되어야 한다. 타임아웃 시 실패로 판정.
- `currentWorkIndex`가 `1`이어야 한다 (work 0 완료 후 advance되어 다음 work를 가리킴).

#### C-2b. 파일시스템 아티팩트 검증

첫 번째 Work Execution이 완료된 시점이므로, WorkflowSpace, WorkTree, WorkSpace가 모두 존재해야 한다.

```bash
# WorkflowSpace 루트
ls /tmp/workflow-spaces/<CP_RUN_ID>/

# WorkTree (git worktree)
ls /tmp/workflow-spaces/<CP_RUN_ID>/work-trees/<GIT_ID>/.git

# WorkSpace 목록 — 최소 1개 디렉토리 존재, 디렉토리명을 기록하라 (<WE_DIR_0>)
ls /tmp/workflow-spaces/<CP_RUN_ID>/workspaces/

# WorkSpace 내부 심링크 확인
ls -la /tmp/workflow-spaces/<CP_RUN_ID>/workspaces/<WE_DIR_0>/
```

**검증:**
- `/tmp/workflow-spaces/<CP_RUN_ID>/` 디렉토리가 존재해야 한다.
- `/tmp/workflow-spaces/<CP_RUN_ID>/work-trees/<GIT_ID>/.git` 가 존재해야 한다.
- `/tmp/workflow-spaces/<CP_RUN_ID>/workspaces/` 하위에 최소 1개의 WorkSpace 디렉토리가 존재해야 한다.
- WorkSpace 디렉토리명을 기록하라 (`<WE_DIR_0>`).

#### C-2c. 체크포인트 목록 조회

work 0 완료 시점에 체크포인트가 생성되어 있어야 한다.

```bash
curl -s http://localhost:3000/workflow-runs/<CP_RUN_ID>/checkpoints
```

**검증:**
- 응답이 배열이며, 최소 1개의 체크포인트가 포함되어야 한다.
- 첫 번째 체크포인트의 `id`를 기록하라 (`<CHECKPOINT_ID>`).
- 체크포인트의 `workSequence`가 `0`이어야 한다.

#### C-2d. AWAITING 상태에서 Work Node 수정

AWAITING 상태에서도 편집 가능해야 한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X PUT http://localhost:3000/workflow-runs/<CP_RUN_ID>/work-nodes/2 \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "taskConfigs": [
      {"order": 0, "query": "Describe the git log history"}
    ]
  }'
```

**검증:**
- 200 또는 202 응답.

### C-3. AWAITING resume 및 다음 work 실행

#### C-3a. AWAITING에서 Resume

AWAITING 상태에서 resume하면 **다음 work가 즉시 실행**된다 (checkpoint revert 없음).

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<CP_RUN_ID>/resume
```

**검증:**
- 200 또는 202 응답.

#### C-3b. 새 WorkSpace 생성 확인

```bash
# work 1에 대한 새 WorkSpace가 생성되었는지 확인
ls /tmp/workflow-spaces/<CP_RUN_ID>/workspaces/
```

**검증:**
- 새 WorkSpace 디렉토리가 존재해야 한다 (`<WE_DIR_0>`과 다른 디렉토리).
- work 0의 WorkSpace(`<WE_DIR_0>`)가 **여전히 존재**해야 한다 (AWAITING resume은 이전 workspace를 삭제하지 않음).

---

## Phase D: 수동 중단과 자동 복원

이 Phase는 수동 중단(PAUSED)에서 resume 시, 이전 checkpoint로 자동 revert되고 같은 work가 재실행되는 흐름을 검증한다.

### D-1. 수동 중단

> **타이밍 주의:** C-3a 직후 즉시 실행하여, 에이전트가 work 1을 완료하기 전에 일시정지시킨다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<CP_RUN_ID>/pause
```

**검증:**
- 200 또는 202 응답.

```bash
curl -s http://localhost:3000/workflow-runs/<CP_RUN_ID>
```

**검증:**
- `status`가 `"PAUSED"`여야 한다.
- `currentWorkIndex`가 `1`이어야 한다 (work 1에서 중단됨).

### D-2. PAUSED 상태에서 Work Node 수정

PAUSED 상태에서 work node 1의 task를 변경한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X PUT http://localhost:3000/workflow-runs/<CP_RUN_ID>/work-nodes/1 \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "taskConfigs": [
      {"order": 0, "query": "After manual pause: describe the current git state"}
    ]
  }'
```

**검증:**
- 200 또는 202 응답.

### D-3. PAUSED에서 Resume (자동 복원)

PAUSED 상태에서 **checkpointId 없이** resume하면:
1. 이전 work(work 0)의 checkpoint로 git이 자동 revert된다.
2. 현재 work(work 1)의 WorkExecution이 DB에서 삭제된다.
3. 해당 WorkExecution에 연결된 Report 결과 파일이 삭제되고, Report 레코드도 DB에서 삭제된다.
4. 현재 work(work 1)의 WorkSpace 디렉토리가 삭제된다.
5. 수정된 설정으로 work 1이 새 WorkExecution으로 재실행된다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<CP_RUN_ID>/resume
```

**검증:**
- 200 또는 202 응답.

### D-4. 자동 복원 후 파일시스템 검증

자동 복원에 의해:
- work 1의 이전 WorkExecution, Report, WorkSpace가 삭제됨
- 새 WorkExecution과 WorkSpace가 생성됨

```bash
# 현재 workspaces 목록 확인
ls /tmp/workflow-spaces/<CP_RUN_ID>/workspaces/

# WorkTree는 여전히 존재해야 한다 (checkpoint 커밋으로 리셋됨)
ls /tmp/workflow-spaces/<CP_RUN_ID>/work-trees/<GIT_ID>/.git
```

**검증:**
- work 1의 이전 WorkSpace가 삭제되고, 새 WorkSpace가 생성되었어야 한다.
- WorkTree는 여전히 존재해야 한다.
- work 0의 WorkSpace(`<WE_DIR_0>`)는 여전히 존재해야 한다 (auto-revert는 현재 work 이후의 workspace만 삭제).

---

## Phase E: 명시적 체크포인트 복원

이 Phase는 명시적으로 checkpointId를 지정하여 특정 시점으로 되돌리는 시나리오를 검증한다.

### E-1. 수동 중단

> **타이밍 주의:** D-3 직후 즉시 실행.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<CP_RUN_ID>/pause
```

**검증:**
- 200 또는 202 응답.

### E-2. 명시적 Checkpoint Resume

C-2c에서 기록한 `<CHECKPOINT_ID>`(work 0의 체크포인트)를 사용하여 복원한다.
이 경우 **checkpoint의 workSequence(0)로 되돌아가** work 0부터 재실행된다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<CP_RUN_ID>/resume \
  -H 'Content-Type: application/json' \
  -d '{
    "checkpointId": "<CHECKPOINT_ID>"
  }'
```

**검증:**
- 200 또는 202 응답.

### E-3. 복원 후 파일시스템 검증

명시적 복원에 의해 work 0 이후의 모든 WorkExecution, Report, WorkSpace가 삭제되어야 한다.

> **타이밍 주의:** E-2 직후 즉시 실행.

```bash
# 즉시 pause하여 검증 시간 확보
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<CP_RUN_ID>/pause
```

```bash
# 이전 WorkSpace들이 삭제되었는지 확인
ls /tmp/workflow-spaces/<CP_RUN_ID>/workspaces/

# WorkTree는 여전히 존재해야 한다
ls /tmp/workflow-spaces/<CP_RUN_ID>/work-trees/<GIT_ID>/.git
```

**검증:**
- `/tmp/workflow-spaces/<CP_RUN_ID>/work-trees/<GIT_ID>/.git` 는 여전히 존재해야 한다.
- work 0 이후의 WorkSpace가 모두 삭제되어야 한다.
- 새 work 0 재실행의 WorkSpace가 생성되었을 수 있다.

---

## Phase F: 정리

### F-1. Run 취소 및 삭제

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflow-runs/<CP_RUN_ID>/cancel \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "Test complete"
  }'
```

**검증:**
- 200 또는 202 응답.

**파일시스템 검증 (종료 이벤트에 의한 전체 자동 정리):**

```bash
ls /tmp/workflow-spaces/<CP_RUN_ID>/
```

- `/tmp/workflow-spaces/<CP_RUN_ID>/` 디렉토리 전체가 존재하지 않아야 한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X DELETE http://localhost:3000/workflow-runs/<CP_RUN_ID>
```

**검증:**
- 200 또는 204 응답.

### F-2. Workflow 정리

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflows/<CP_WORKFLOW_ID>/deactivate
curl -s -w "\nHTTP_STATUS: %{http_code}" -X DELETE http://localhost:3000/workflows/<CP_WORKFLOW_ID>
```

**검증:**
- 각각 200 응답.

### F-3. 리소스 삭제 보호 검증

Workflow가 참조하는 Git을 삭제하면 에러가 발생해야 한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X DELETE http://localhost:3000/gits/<GIT_ID>
```

**검증:**
- 400 또는 409 에러 응답이 와야 한다 (Phase A의 Workflow가 참조 중이므로 삭제 불가).

### F-4. 남은 리소스 삭제

Phase A에서 생성한 Workflow를 비활성화 및 삭제한 뒤, Git과 MCP 서버를 삭제한다.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/workflows/<WORKFLOW_ID>/deactivate
curl -s -w "\nHTTP_STATUS: %{http_code}" -X DELETE http://localhost:3000/workflows/<WORKFLOW_ID>
```

**검증:**
- 각각 200 응답.

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X DELETE http://localhost:3000/gits/<GIT_ID>
```

**검증:**
- 200 응답.
- `/tmp/manual-test-repo` 디렉토리가 실제로 삭제되었는지 확인 (`ls /tmp/manual-test-repo`가 실패해야 함).

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X DELETE http://localhost:3000/mcp-servers/<MCP_SERVER_ID>
```

**검증:**
- 200 응답.

### F-5. 서버 종료

- 서버 프로세스를 종료하라.
- `/tmp/manual-test-repo`가 남아있다면 삭제하라.

---

## 테스트 결과 리포트

각 단계의 성공/실패 여부를 표로 정리하여 보고하라:

| 단계 | Phase | 설명 | 결과 | 비고 |
|------|-------|------|------|------|
| A-2 | A | Git 등록 (실제 clone) | | |
| A-3 | A | MCP 서버 등록 | | |
| A-4 | A | Workflow 생성 (work node 3개) | | |
| B-1a | B | Workflow 활성화 | | |
| B-1b | B | Workflow Run 시작 + 파일시스템 생성 확인 | | |
| B-2 | B | 실행 중 Work Node 수정 방어 | | |
| B-3a | B | Workflow Run 일시정지 | | |
| B-3b | B | 기존 Work Node 수정 (PAUSED) | | |
| B-3c | B | Work Node 추가 | | |
| B-3d | B | Work Node 삭제 | | |
| B-4a | B | Workflow Run 취소 + 파일시스템 정리 확인 | | |
| B-4b | B | 취소된 Run 재취소 방어 | | |
| B-4c | B | Workflow Run 삭제 | | |
| B-4d | B | 삭제된 Run 재삭제 방어 | | |
| C-1a | C | AWAITING 테스트용 Workflow 생성 | | |
| C-1b | C | Workflow 활성화 | | |
| C-1c | C | Workflow Run 시작 (에이전트 실행) | | |
| C-2a | C | 실행 상태 폴링 (AWAITING 대기) | | |
| C-2b | C | 파일시스템 아티팩트 검증 | | |
| C-2c | C | 체크포인트 목록 조회 | | |
| C-2d | C | AWAITING 상태에서 Work Node 수정 | | |
| C-3a | C | AWAITING에서 Resume | | |
| C-3b | C | 새 WorkSpace 생성 확인 | | |
| D-1 | D | 수동 중단 (PAUSED) | | |
| D-2 | D | PAUSED 상태에서 Work Node 수정 | | |
| D-3 | D | PAUSED에서 Resume (자동 복원) | | |
| D-4 | D | 자동 복원 후 파일시스템 검증 | | |
| E-1 | E | 수동 중단 | | |
| E-2 | E | 명시적 Checkpoint Resume | | |
| E-3 | E | 복원 후 파일시스템 검증 | | |
| F-1 | F | Run 취소 + 삭제 + 파일시스템 정리 | | |
| F-2 | F | Workflow 정리 (비활성화 + 삭제) | | |
| F-3 | F | Git 삭제 보호 | | |
| F-4 | F | 리소스 삭제 (Workflow, Git, MCP) | | |
