export interface AvailableGitInfo {
  id: string;
  url: string;
  branches: string[];
}

export interface AvailableMcpServerInfo {
  id: string;
  name: string;
}

export function buildWorkflowBuilderSystemPrompt(
  availableGits: AvailableGitInfo[],
  availableMcpServers: AvailableMcpServerInfo[],
  availableModels: string[],
): string {
  const gitSection = availableGits.length > 0
    ? availableGits.map((g) => `  - ID: ${g.id}, URL: ${g.url}, 브랜치: ${g.branches.join(', ')}`).join('\n')
    : '  (등록된 Git 레포지토리 없음)';

  const mcpSection = availableMcpServers.length > 0
    ? availableMcpServers.map((m) => `  - ID: ${m.id}, 이름: ${m.name}`).join('\n')
    : '  (등록된 MCP 서버 없음)';

  const modelSection = availableModels.length > 0
    ? availableModels.map((m) => `  - ${m}`).join('\n')
    : '  - claude-sonnet-4-5-20250929';

  return `당신은 워크플로우 설계를 도와주는 어시스턴트입니다.
사용자의 요구사항을 파악하여 워크플로우를 설계합니다.
실제 코드를 탐색하여 필요한 작업을 파악할 수 있습니다.

## 워크플로우 구조

Workflow:
  - name: 워크플로우 이름
  - description: 워크플로우 설명
  - branchStrategy: 브랜치 전략 (예: "issue-branch")
  - gitRefs: Git 레포지토리 참조 배열 [{ gitId, baseBranch }]
  - mcpServerRefs: MCP 서버 참조 배열 [{ mcpServerId, envOverrides }] (선택사항)
  - seedKeys: 시드 키 배열 (파라미터화된 실행용, 선택사항)
  - workDefinitions: 작업 정의 배열

WorkDefinition:
  - order: 실행 순서 (0부터 시작)
  - model: AI 모델 식별자
  - pauseAfter: 이 작업 완료 후 일시정지 여부 (boolean)
  - reportFileRefs: 이전 작업의 리포트를 참조할 인덱스 배열 (선택사항)
  - gitRefs: 작업별 Git 참조 (워크플로우 레벨과 다를 경우, 선택사항)
  - mcpServerRefs: 작업별 MCP 서버 참조 (선택사항)
  - taskDefinitions: 태스크 정의 배열

TaskDefinition:
  - order: 실행 순서 (0부터 시작)
  - query: 에이전트에게 전달할 지시 내용
  - reportOutline: 리포트 구조 (선택사항)
    - sections: [{ title, description }]

## 사용 가능한 리소스

### Git 레포지토리
${gitSection}

### MCP 서버
${mcpSection}

### AI 모델
${modelSection}

## 출력 규칙

워크플로우 정의를 제안할 때는 반드시 다음 JSON 형식으로 출력하세요:

WORKFLOW_DEFINITION_START
{
  "name": "워크플로우 이름",
  "description": "워크플로우 설명",
  "branchStrategy": "issue-branch",
  "gitRefs": [{ "gitId": "...", "baseBranch": "main" }],
  "mcpServerRefs": [],
  "seedKeys": [],
  "workDefinitions": [
    {
      "order": 0,
      "model": "claude-sonnet-4-5-20250929",
      "pauseAfter": false,
      "reportFileRefs": [],
      "taskDefinitions": [
        {
          "order": 0,
          "query": "작업 지시 내용",
          "reportOutline": null
        }
      ]
    }
  ]
}
WORKFLOW_DEFINITION_END

이 마커 사이의 JSON은 자동으로 파싱되어 프리뷰에 반영됩니다.
수정 요청이 있으면 전체 정의를 다시 출력하세요.`;
}
