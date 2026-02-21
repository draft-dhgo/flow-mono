# Workflow Builder UI Tests

## TC-BLD-01: Navigate to /workflow-builder page
- **Preconditions:** Servers running, logged in
- **Steps:**
  1. Click "Builder" in sidebar
- **Expected Result:** Page loads with heading "워크플로우 빌더", filter buttons (전체/활성/완료), table or empty state
- **Actual Result:**
- **Status:**

## TC-BLD-02: Empty state shows create action
- **Preconditions:** No builder sessions exist
- **Steps:**
  1. Navigate to /workflow-builder
- **Expected Result:** Empty message "빌더 세션이 없습니다." with "새 빌더 세션" action button
- **Actual Result:**
- **Status:**

## TC-BLD-03: Builder list only shows WORKFLOW_BUILDER workspaces
- **Preconditions:** Both GENERAL and WORKFLOW_BUILDER workspaces exist
- **Steps:**
  1. Navigate to /workflow-builder
  2. Navigate to /workspaces
  3. Compare lists
- **Expected Result:** /workflow-builder shows only WORKFLOW_BUILDER purpose; /workspaces shows all types
- **Actual Result:**
- **Status:**

## TC-BLD-04: Click "새 빌더 세션" button
- **Preconditions:** On /workflow-builder page
- **Steps:**
  1. Click "새 빌더 세션" button
- **Expected Result:** Navigates to /workflow-builder/new with create form
- **Actual Result:**
- **Status:**

## TC-BLD-05: Create form — fields and layout
- **Preconditions:** On /workflow-builder/new
- **Steps:**
  1. Verify form sections: 세션 이름, 모델, Git 레포지토리, MCP 서버
- **Expected Result:** Name text input, model dropdown, git ref section (repo + baseBranch, NO branchName field), MCP server checkboxes
- **Actual Result:**
- **Status:**

## TC-BLD-06: Create form — no branchName field (builder mode)
- **Preconditions:** On /workflow-builder/new
- **Steps:**
  1. Add a git ref row
  2. Check available fields per git ref
- **Expected Result:** Only "레포지토리" and "기본 브랜치" fields shown (no "새 브랜치명" — builder uses read-only worktree)
- **Actual Result:**
- **Status:**

## TC-BLD-07: Create form validation
- **Preconditions:** On /workflow-builder/new
- **Steps:**
  1. Try to submit with empty name
  2. Try to submit with no git refs
- **Expected Result:** "빌더 세션 생성" button disabled when name empty or no git refs
- **Actual Result:**
- **Status:**

## TC-BLD-08: Create builder session
- **Preconditions:** Name filled, model selected, git ref added
- **Steps:**
  1. Fill name "테스트 빌더"
  2. Select model
  3. Add git ref (select repo, baseBranch="main")
  4. Click "빌더 세션 생성"
- **Expected Result:** Session created, navigates to /workflow-builder/:id, agent session auto-starts with greeting
- **Actual Result:**
- **Status:**

## TC-BLD-09: Builder session — layout
- **Preconditions:** On /workflow-builder/:id for an active session
- **Steps:**
  1. Verify layout structure
- **Expected Result:** Header with session name + status badge + action buttons. Split view: ChatPanel (left, ~450px) + WorkflowPreviewCanvas (right)
- **Actual Result:**
- **Status:**

## TC-BLD-10: Builder session — agent greeting
- **Preconditions:** Newly created builder session
- **Steps:**
  1. Check chat panel for initial messages
- **Expected Result:** Agent sends greeting mentioning available git repos, models, MCP servers, and workflow design examples
- **Actual Result:**
- **Status:**

## TC-BLD-11: Builder session — preview empty state
- **Preconditions:** Agent has not yet generated a workflow definition
- **Steps:**
  1. Check right panel (WorkflowPreviewCanvas)
- **Expected Result:** Empty state with Sparkles icon and message "에이전트에게 워크플로우를 설계해달라고 요청하세요."
- **Actual Result:**
- **Status:**

## TC-BLD-12: Chat with agent to design workflow
- **Preconditions:** Active builder session
- **Steps:**
  1. Type a workflow request (e.g., "코드 리뷰 자동화 워크플로우를 만들어줘. 2단계로: 1단계 리뷰, 2단계 테스트")
  2. Press Enter or click send
- **Expected Result:** Agent responds with workflow description and WORKFLOW_DEFINITION_START/END markers containing JSON
- **Actual Result:**
- **Status:**

## TC-BLD-13: Preview canvas shows workflow after agent response
- **Preconditions:** Agent has responded with WORKFLOW_DEFINITION markers
- **Steps:**
  1. Check WorkflowPreviewCanvas after agent response
- **Expected Result:** Preview shows: workflow name (heading), description, metadata (브랜치 전략, Work 개수), ReactFlow canvas with Start → Work nodes → End nodes, sequence edges and reportRef edges
- **Actual Result:**
- **Status:**

## TC-BLD-14: Preview canvas — node details
- **Preconditions:** Preview canvas shows workflow
- **Steps:**
  1. Verify node content: Work nodes show "Work #N", model, task count, reportFileRef count
  2. Verify Task nodes show "Task #N" and truncated query text
- **Expected Result:** Work nodes display model and badge counts; Task nodes show query preview
- **Actual Result:**
- **Status:**

## TC-BLD-15: Preview canvas — zoom controls
- **Preconditions:** Preview canvas visible
- **Steps:**
  1. Click Zoom In
  2. Click Zoom Out
  3. Click Fit View
- **Expected Result:** Canvas zooms in/out/fits correctly
- **Actual Result:**
- **Status:**

## TC-BLD-16: "워크플로우 생성" button appears
- **Preconditions:** Preview exists (agent provided workflow definition)
- **Steps:**
  1. Check header area for "워크플로우 생성" button
  2. Check preview canvas area for "워크플로우 생성" button
- **Expected Result:** Button appears in both header and preview canvas when preview is not null
- **Actual Result:**
- **Status:**

## TC-BLD-17: Build workflow from preview
- **Preconditions:** Preview exists, "워크플로우 생성" button visible
- **Steps:**
  1. Click "워크플로우 생성" button
- **Expected Result:** Workflow created from preview, navigates to /workflows/:workflowId
- **Actual Result:**
- **Status:**

## TC-BLD-18: Created workflow matches preview
- **Preconditions:** Workflow created via TC-BLD-17
- **Steps:**
  1. On the workflow detail/edit page, verify: name, description, work definitions, task definitions, reportFileRefs
- **Expected Result:** Workflow data matches the agent's design (name, model, tasks, pauseAfter, reportFileRefs)
- **Actual Result:**
- **Status:**

## TC-BLD-19: Build workflow error handling
- **Preconditions:** Preview exists with invalid model or data
- **Steps:**
  1. Click "워크플로우 생성"
- **Expected Result:** ErrorAlert shown with error message (e.g., invalid model)
- **Actual Result:**
- **Status:**

## TC-BLD-20: Iterative design — request modifications
- **Preconditions:** Preview exists from initial design
- **Steps:**
  1. Send chat message requesting changes (e.g., "2단계에 pauseAfter를 추가해줘")
  2. Wait for agent response
- **Expected Result:** Agent outputs updated WORKFLOW_DEFINITION, preview canvas updates with changes
- **Actual Result:**
- **Status:**

## TC-BLD-21: Complete builder session
- **Preconditions:** On active builder session detail page
- **Steps:**
  1. Click "완료" button
  2. Confirm in dialog
- **Expected Result:** Status changes to COMPLETED, chat disabled, session ends
- **Actual Result:**
- **Status:**

## TC-BLD-22: Delete builder session
- **Preconditions:** On builder session detail page
- **Steps:**
  1. Click "삭제" button
  2. Confirm in dialog
- **Expected Result:** Session deleted, navigates to /workflow-builder list
- **Actual Result:**
- **Status:**

## TC-BLD-23: Delete builder session from list
- **Preconditions:** Builder session exists in list
- **Steps:**
  1. Click trash icon on builder session row
  2. Confirm deletion
- **Expected Result:** Session removed from table
- **Actual Result:**
- **Status:**

## TC-BLD-24: Builder list filter buttons
- **Preconditions:** Both ACTIVE and COMPLETED builder sessions exist
- **Steps:**
  1. Click "활성" filter → shows only active sessions
  2. Click "완료" filter → shows only completed sessions
  3. Click "전체" filter → shows all
- **Expected Result:** Table filters correctly, count badges match
- **Actual Result:**
- **Status:**

## TC-BLD-25: Click builder session row to detail
- **Preconditions:** Builder session exists in list
- **Steps:**
  1. Click on a builder session row
- **Expected Result:** Navigates to /workflow-builder/:id detail page
- **Actual Result:**
- **Status:**
