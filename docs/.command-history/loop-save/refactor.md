# Vertical Slice Restructuring

## 실행 커맨드

```
/ralph-loop "loop-save/refactor.md 파일을 읽고 스펙에 따라 프로젝트를 버티컬 슬라이스로 리팩터링하라. 완료되면 promise 태그로 VERTICAL SLICE COMPLETE를 출력하라." --completion-promise "VERTICAL SLICE COMPLETE" --max-iterations 15
```

---

## 목표

현재 수평 슬라이스 구조(src/domain/, src/application/)를 도메인 feature 별 버티컬 슬라이스 구조로 전환한다.

## 현재 구조

    src/
      common/               -- 유지
      domain/
        workflow/
        workflow-runtime/
        git/
        mcp/
        agent/
      application/
        workflow/
        workflow-runtime/
        git/
        mcp/
        agent/
      shared/

## 목표 구조

    src/
      common/                    -- 공유 패키지 (이벤트, ID, 에러, VO)
        aggregate-root.ts
        events/                  -- 도메인 간 이벤트 정의
        ids/                     -- 공유 ID (WorkflowId, GitId, McpServerId)
        value-objects/
        errors/

      workflow/                  -- Workflow 도메인 feature
        domain/
          entities/              -- from src/domain/workflow/entities/
          value-objects/         -- from src/domain/workflow/value-objects/
          ports/                 -- from src/domain/workflow/ports/
          errors/                -- from src/domain/workflow/errors/
        application/
          use-cases/             -- from src/application/workflow/use-cases/
          event-handlers/        -- from src/application/workflow/event-handlers/
        infra/                   -- 새로 생성
        presentation/            -- 새로 생성

      workflow-runtime/          -- Workflow Runtime 도메인 feature
        domain/
          entities/              -- from src/domain/workflow-runtime/entities/
          value-objects/         -- from src/domain/workflow-runtime/value-objects/
          ports/                 -- from src/domain/workflow-runtime/ports/
          errors/                -- from src/domain/workflow-runtime/errors/
        application/
          use-cases/             -- from src/application/workflow-runtime/use-cases/
          event-handlers/        -- from src/application/workflow-runtime/event-handlers/
          adapters/              -- from src/application/workflow-runtime/adapters/
        infra/                   -- 새로 생성
        presentation/            -- 새로 생성

      git/                       -- Git 도메인 feature
        domain/
          entities/              -- from src/domain/git/entities/
          value-objects/         -- from src/domain/git/value-objects/
          ports/                 -- from src/domain/git/ports/
          errors/                -- from src/domain/git/errors/
        application/
          use-cases/             -- from src/application/git/use-cases/
        infra/                   -- 새로 생성
        presentation/            -- 새로 생성

      mcp/                       -- MCP 도메인 feature
        domain/
          entities/              -- from src/domain/mcp/entities/
          value-objects/         -- from src/domain/mcp/value-objects/
          ports/                 -- from src/domain/mcp/ports/
          errors/                -- from src/domain/mcp/errors/
        application/
          use-cases/             -- from src/application/mcp/use-cases/
        infra/                   -- 새로 생성
        presentation/            -- 새로 생성

      agent/                     -- Agent 도메인 feature
        domain/
          entities/              -- from src/domain/agent/entities/
          value-objects/         -- from src/domain/agent/value-objects/
          ports/                 -- from src/domain/agent/ports/
          errors/                -- from src/domain/agent/errors/
        application/
          use-cases/             -- from src/application/agent/
        infra/                   -- 새로 생성
        presentation/            -- 새로 생성

## 규칙

### 1. 파일 이동 매핑
- src/domain/{feature}/* -> src/{feature}/domain/*
- src/application/{feature}/* -> src/{feature}/application/*
- src/common/ -> 그대로 유지 (공유 패키지)
- src/shared/ -> src/common/으로 병합 또는 유지

### 2. tsconfig.json path alias 업데이트
기존 paths를 제거하고 아래로 교체:
- @common/* -> src/common/*
- @workflow/* -> src/workflow/*
- @workflow-runtime/* -> src/workflow-runtime/*
- @git/* -> src/git/*
- @mcp/* -> src/mcp/*
- @agent/* -> src/agent/*

### 3. import 경로 업데이트
모든 파일의 import를 새 path alias에 맞게 변경:
- @domain/workflow/... -> @workflow/domain/...
- @domain/git/... -> @git/domain/...
- @domain/mcp/... -> @mcp/domain/...
- @domain/agent/... -> @agent/domain/...
- @domain/workflow-runtime/... -> @workflow-runtime/domain/...
- @application/workflow/... -> @workflow/application/...
- @application/git/... -> @git/application/...
- @application/mcp/... -> @mcp/application/...
- @application/agent/... -> @agent/application/...
- @application/workflow-runtime/... -> @workflow-runtime/application/...
- @common/* -> 유지

### 4. 도메인 간 상호작용 규칙
- 도메인 간 직접 import 금지
- 반드시 @common/events의 이벤트를 통해서만 상호작용
- 공유 ID 타입은 @common/ids에서 import
- 도메인 간 공유되는 value object는 @common/value-objects에서 import
- 현재 application layer에서 다른 도메인의 repository를 직접 참조하는 코드가 있으면 이벤트 기반으로 전환

### 5. 도메인 간 직접 의존성 제거 대상
현재 위반 사항:
- application/workflow-runtime/ -> domain/workflow/, domain/agent/, domain/git/, domain/mcp/ 직접 참조
- application/git/ -> domain/workflow/ 직접 참조 (DeleteGitUseCase에서 workflowRepository 사용)
- application/mcp/ -> domain/workflow/ 직접 참조 (UnregisterMcpServerUseCase에서 workflowRepository 사용)

이들을 이벤트 기반으로 전환:
- Git 삭제 시: GitDeleted 이벤트 발행 -> Workflow 도메인의 event-handler에서 처리
- MCP 해제 시: McpServerUnregistered 이벤트 발행 -> Workflow 도메인의 event-handler에서 처리
- WorkflowRun 시작 시: Workflow 정보 조회는 common/에 Query 인터페이스를 정의하여 간접 참조

### 6. index.ts 배럴 파일
각 feature의 public API를 노출하는 index.ts를 최상위에 생성:
- src/workflow/index.ts
- src/workflow-runtime/index.ts
- src/git/index.ts
- src/mcp/index.ts
- src/agent/index.ts

### 7. infra/ 및 presentation/ 초기 구조
비어있는 레이어도 export {}만 있는 index.ts와 함께 생성

## 작업 순서 (반복마다)
1. 먼저 git status 확인 - 변경 사항이 있으면 commit
2. 목표 구조와 현재 구조를 비교
3. 아직 이동하지 않은 파일이 있으면 이동
4. import 경로 업데이트
5. tsconfig.json 업데이트
6. 빈 src/domain/ 및 src/application/ 디렉토리 제거
7. tsc --noEmit 으로 타입 체크
8. 에러가 있으면 수정
9. 모든 파일이 이동되고 모든 import가 수정되고 tsc가 통과하면 commit 후 완료

## 완료 조건
- 모든 도메인이 버티컬 슬라이스 구조로 이동됨
- src/domain/ 및 src/application/ 디렉토리가 제거됨
- tsconfig.json path alias가 feature 기반으로 업데이트됨
- 모든 import 경로가 새 alias로 업데이트됨
- 도메인 간 직접 import가 제거되고 이벤트 기반으로 전환됨
- tsc --noEmit 통과
- 각 feature에 domain/, application/, infra/, presentation/ 디렉토리 존재

## 처리 순서
workflow -> git -> mcp -> agent -> workflow-runtime (의존성 적은 것부터, workflow-runtime은 마지막)
