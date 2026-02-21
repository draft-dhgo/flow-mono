# Workspace UI Tests

## TC-WS-01: Navigate to /workspaces page
- **Preconditions:** Servers running (backend :3000, frontend :5173), logged in
- **Steps:**
  1. Click "Workspaces" in sidebar
- **Expected Result:** Page loads with heading "워크스페이스", filter buttons (전체/활성/완료), and table or empty state
- **Actual Result:**
- **Status:**

## TC-WS-02: Empty state shows create action
- **Preconditions:** No workspaces exist
- **Steps:**
  1. Navigate to /workspaces
- **Expected Result:** Empty message "워크스페이스가 없습니다." with "새 워크스페이스" action button
- **Actual Result:**
- **Status:**

## TC-WS-03: Click "새 워크스페이스" button
- **Preconditions:** On /workspaces page
- **Steps:**
  1. Click "새 워크스페이스" button
- **Expected Result:** Navigates to /workspaces/new with create form
- **Actual Result:**
- **Status:**

## TC-WS-04: Create form loads with all sections
- **Preconditions:** On /workspaces/new
- **Steps:**
  1. Verify form sections: 이름, 모델, Git 레포지토리, MCP 서버
- **Expected Result:** Name text input, model dropdown, git ref section with "+ 추가" button, MCP server checkboxes (or empty message)
- **Actual Result:**
- **Status:**

## TC-WS-05: Create form validation — empty submit
- **Preconditions:** On /workspaces/new, form is empty
- **Steps:**
  1. Click "워크스페이스 생성" without filling any fields
- **Expected Result:** Submit button is disabled (name empty, no git refs)
- **Actual Result:**
- **Status:**

## TC-WS-06: Add git ref row
- **Preconditions:** On /workspaces/new, at least one git repo registered
- **Steps:**
  1. Click "+ 추가" in Git 레포지토리 section
  2. Select a repository from dropdown
  3. Enter base branch (e.g., "main")
  4. Enter new branch name (e.g., "workspace/test-feature")
- **Expected Result:** Git ref row added with filled values
- **Actual Result:**
- **Status:**

## TC-WS-07: Remove git ref row
- **Preconditions:** At least one git ref row exists in form
- **Steps:**
  1. Click delete icon on a git ref row
- **Expected Result:** Row removed from form
- **Actual Result:**
- **Status:**

## TC-WS-08: Create workspace with valid data
- **Preconditions:** Name filled, model selected, at least 1 git ref with branchName
- **Steps:**
  1. Fill name "테스트 워크스페이스"
  2. Select model "Claude Sonnet 4.5"
  3. Add git ref (select repo, baseBranch="main", branchName="workspace/test")
  4. Click "워크스페이스 생성"
- **Expected Result:** Workspace created, navigates to /workspaces/:id detail page
- **Actual Result:**
- **Status:**

## TC-WS-09: MCP server selection (checkbox)
- **Preconditions:** MCP servers registered, on create form
- **Steps:**
  1. Check one or more MCP server checkboxes
  2. Create workspace
- **Expected Result:** Workspace created with MCP server refs
- **Actual Result:**
- **Status:**

## TC-WS-10: Workspace list shows created workspace
- **Preconditions:** Workspace created in TC-WS-08
- **Steps:**
  1. Navigate to /workspaces
- **Expected Result:** Table shows workspace with name, 활성 status badge, model, git count, creation date
- **Actual Result:**
- **Status:**

## TC-WS-11: Status filter buttons
- **Preconditions:** Both ACTIVE and COMPLETED workspaces exist
- **Steps:**
  1. Click "활성" filter
  2. Click "완료" filter
  3. Click "전체" filter
- **Expected Result:** Table filters correctly, count badges update
- **Actual Result:**
- **Status:**

## TC-WS-12: Click workspace row to detail page
- **Preconditions:** Workspace exists in table
- **Steps:**
  1. Click on a workspace row
- **Expected Result:** Navigates to /workspaces/:id detail page
- **Actual Result:**
- **Status:**

## TC-WS-13: Detail page — header and info bar
- **Preconditions:** On /workspaces/:id for an ACTIVE workspace
- **Steps:**
  1. Verify header shows workspace name and 활성 status badge
  2. Verify info bar shows model and git branch info
- **Expected Result:** Name, status badge, model, git URL + branch displayed
- **Actual Result:**
- **Status:**

## TC-WS-14: Detail page — file explorer view
- **Preconditions:** On workspace detail, workspace has files
- **Steps:**
  1. Click "파일 탐색" tab
  2. Expand folders in tree
  3. Click a file
- **Expected Result:** File tree shows folders/files, clicking file shows content in Monaco editor (read-only)
- **Actual Result:**
- **Status:**

## TC-WS-15: Detail page — diff view
- **Preconditions:** On workspace detail, agent has made changes
- **Steps:**
  1. Click "Diff 뷰" tab
  2. Click a changed file in the file list
- **Expected Result:** Left panel shows changed file list with count, right panel shows side-by-side diff in Monaco editor
- **Actual Result:**
- **Status:**

## TC-WS-16: Detail page — diff view git selector
- **Preconditions:** Workspace has multiple git refs
- **Steps:**
  1. Switch to Diff view
  2. Change git dropdown to different repo
- **Expected Result:** Diff updates to show changes for selected git repo
- **Actual Result:**
- **Status:**

## TC-WS-17: Detail page — chat panel (send message)
- **Preconditions:** On ACTIVE workspace detail
- **Steps:**
  1. Type a message in chat textarea
  2. Press Enter (or click send button)
- **Expected Result:** Message sent to agent, response appears in chat with agent icon and text
- **Actual Result:**
- **Status:**

## TC-WS-18: Detail page — chat panel (Shift+Enter for newline)
- **Preconditions:** Chat textarea focused
- **Steps:**
  1. Press Shift+Enter
- **Expected Result:** Newline inserted in textarea (message NOT sent)
- **Actual Result:**
- **Status:**

## TC-WS-19: Detail page — chat tool groups
- **Preconditions:** Agent has used tools (tool_use/tool_result entries exist)
- **Steps:**
  1. Look for collapsed tool group entries in chat
  2. Click to expand
- **Expected Result:** Tool group shows wrench icon, tool names and counts; expands to show tool details
- **Actual Result:**
- **Status:**

## TC-WS-20: Detail page — chat disabled when completed
- **Preconditions:** Workspace is in COMPLETED status
- **Steps:**
  1. Navigate to completed workspace detail
  2. Check chat textarea
- **Expected Result:** Textarea disabled with placeholder "완료된 워크스페이스입니다", send button disabled
- **Actual Result:**
- **Status:**

## TC-WS-21: Complete workspace
- **Preconditions:** On ACTIVE workspace detail page
- **Steps:**
  1. Click "완료" button
  2. Confirm in dialog
- **Expected Result:** Status changes to COMPLETED, "완료" button disappears, "원격 푸시" button appears, chat disabled
- **Actual Result:**
- **Status:**

## TC-WS-22: Remote push (completed workspace)
- **Preconditions:** On COMPLETED workspace detail page
- **Steps:**
  1. Click "원격 푸시" button
  2. Confirm in dialog
- **Expected Result:** Push executed, PushResultDialog appears showing results table with success/error per branch
- **Actual Result:**
- **Status:**

## TC-WS-23: Push result dialog content
- **Preconditions:** PushResultDialog is open after push
- **Steps:**
  1. Verify results table shows: 프로젝트, 브랜치, 결과 columns
  2. Click "닫기"
- **Expected Result:** Each row shows git ID, branch name, success/error icon. Dialog closes on "닫기"
- **Actual Result:**
- **Status:**

## TC-WS-24: Delete workspace
- **Preconditions:** On workspace detail page
- **Steps:**
  1. Click "삭제" button
  2. Confirm in dialog ("이 워크스페이스를 삭제하시겠습니까?")
- **Expected Result:** Workspace deleted, navigates back to /workspaces list
- **Actual Result:**
- **Status:**

## TC-WS-25: Delete workspace from list page
- **Preconditions:** On /workspaces list, workspace exists
- **Steps:**
  1. Click trash icon on a workspace row
  2. Confirm deletion
- **Expected Result:** Workspace removed from table
- **Actual Result:**
- **Status:**
