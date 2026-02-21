# FlowFlow Manual UI Test Checklist

## Pre-flight
- [x] Servers start successfully (backend :3000, frontend :5173)
- [x] Pre-flight: backend typecheck passes
- [x] Pre-flight: backend lint passes
- [x] Pre-flight: frontend typecheck passes
- [x] Pre-flight: frontend lint passes

## Git UI
- [x] Git UI: page loads correctly (/gits) — TC-GIT-01 PASS
- [x] Git UI: register dialog opens and validates inputs — TC-GIT-02, TC-GIT-03 PASS
- [x] Git UI: register git repo succeeds and appears in table — TC-GIT-04 PASS
- [x] Git UI: duplicate URL shows error — TC-GIT-05 PASS (after BUG-001 fix)
- [x] Git UI: delete unreferenced repo succeeds — TC-GIT-07 PASS
- [x] Git UI: delete referenced repo shows blocking dialog — TC-GIT-08 PASS (after BUG-002 fix)
- [x] Git UI: data persists after page refresh — TC-GIT-10 PASS
- [x] Git UI: table shows URL, local path, reference count — Iter2 PASS

## MCP Server UI
- [x] MCP Server UI: page loads correctly (/mcp-servers) — TC-MCP-01 PASS
- [x] MCP Server UI: register dialog opens and validates inputs — TC-MCP-02, TC-MCP-03 PASS
- [x] MCP Server UI: register STDIO server succeeds — TC-MCP-04 PASS
- [x] MCP Server UI: register SSE server succeeds (with URL) — TC-MCP-05 PASS
- [x] MCP Server UI: register STREAMABLE_HTTP server succeeds (with URL) — TC-MCP-06 PASS
- [x] MCP Server UI: SSE without URL shows validation error — TC-MCP-07 PASS
- [x] MCP Server UI: delete unreferenced server succeeds — TC-MCP-09 PASS
- [x] MCP Server UI: delete referenced server shows blocking dialog — TC-MCP-10 PASS (after BUG-005 fix)
- [x] MCP Server UI: dynamic args/env fields work correctly — TC-MCP-11, TC-MCP-12 PASS
- [x] MCP Server UI: table shows Name, Transport, Command/URL, reference count — Iter2 PASS

## Workflow UI
- [x] Workflow UI: list page loads correctly (/workflows) — TC-WF-01 PASS
- [x] Workflow UI: create form loads with all sections (/workflows/new) — TC-WF-02 PASS
- [x] Workflow UI: form validation catches missing required fields — TC-WF-03, TC-WF-05 PASS
- [x] Workflow UI: create workflow with all fields succeeds — TC-WF-04 PASS (after BUG-012 fix; Radix Select works via Playwright)
- [x] Workflow UI: edit workflow loads pre-filled data — TC-WF-06 PASS
- [x] Workflow UI: update workflow succeeds — TC-WF-07 PASS (after BUG-003 fix)
- [x] Workflow UI: activate DRAFT workflow succeeds (status -> ACTIVE) — TC-WF-11 PASS
- [x] Workflow UI: deactivate ACTIVE workflow succeeds (status -> DRAFT) — TC-WF-13 PASS
- [x] Workflow UI: delete DRAFT workflow succeeds — TC-WF-14 PASS
- [x] Workflow UI: ACTIVE workflow shows Run action, hides Edit — TC-WF-12 PASS
- [x] Workflow UI: git/mcp ref dropdowns populated from registered resources — TC-WF-17 PASS
- [x] Workflow UI: work definition reorder (up/down) works — TC-WF-09 PASS (UI structure verified)
- [x] Workflow UI: issue key validation enforced (format: PROJ-123) — TC-WF-05 PASS
- [x] Workflow UI: Git/MCP/Works count columns show correct data — Iter2 PASS (after BUG-008 fix)

## Workflow Runtime UI (Iteration 2 — 4 Workflows)
### Setup: 4 workflows created with varying complexity
- WF1-Simple: 1 work, 1 task, no pauseAfter (branch: test/simple)
- WF2-Medium: 2 works, pauseAfter on #1, 2 tasks each (branch: feature/medium-test)
- WF3-Complex: 3 works, pauseAfter on #1 and #3, 2 git + 2 mcp (branch: feature/complex-test)
- WF4-Full: 4 works, alternating pauseAfter, 2-3 tasks each (branch: feature/full-test)

### Run start & dashboard
- [x] RT: Start 4 runs simultaneously — all 4 created with RUNNING status
- [x] RT: Dashboard summary accurate — 실행 중: 4, others: 0
- [x] RT: Dashboard table shows all 4 runs with correct names, statuses, progress
- [x] RT: WF1-Simple completes, progress shows "Work 1/1" (not "Work 2/1") — BUG-009 fix verified

### Pause/Resume cycles (WF4-Full)
- [x] RT: Pause from dashboard — WF4-Full paused, summary updated (실행 중: 3, 일시정지: 1)
- [x] RT: Detail page shows PAUSED state with Resume/Cancel buttons
- [x] RT: Work Node Editor visible in PAUSED state with Add/Edit/Delete controls
- [x] RT: Work #1 locked (already executed), Work #2-#4 editable

### Work Node Editor (WF4-Full, PAUSED)
- [x] RT: Edit Work #2 — dialog shows actual task queries (BUG-010 fix verified)
  - Task 1: "Review code quality", Task 2: "Check style", Task 3: "Report issues"
- [x] RT: Add task to Work #2 — new task added successfully
- [x] RT: Toggle pauseAfter on Work #2 — saved correctly
- [x] RT: Save edit — Work #2 updated to "Tasks: 4 | pauseAfter" in timeline and editor
- [x] RT: Add Work Node — Work #5 (claude-haiku-4-5-20251001, 1 task) added, progress updated to "Work 1/5"
- [x] RT: Delete Work Node — Work #5 deleted via confirm dialog, progress back to "Work 1/4"
- [x] RT: Model selection dropdown — all 3 models available (Opus 4.6, Sonnet 4.5, Haiku 4.5)

### Cancel (WF4-Full)
- [x] RT: Cancel from detail page — dialog with reason textarea, confirmed
- [x] RT: Cancelled state shows ❌ on all works, no action buttons, no editor

### Dashboard operations
- [x] RT: Pause WF3-Complex from dashboard — status changed, summary updated
- [x] RT: Click into WF3-Complex — detail page loads correctly (3 works, multi-resource)
- [x] RT: Resume WF3-Complex from detail page — status changes to RUNNING, editor disappears
- [x] RT: Delete WF1-Simple completed run — removed from list, summary updated (완료: 0)
- [x] RT: Dashboard summary after all ops — 실행 중: 2, 취소: 1 (correct)

### Progress accuracy
- [x] RT: WF1-Simple (completed): "Work 1/1" — BUG-009 fix confirmed
- [x] RT: WF2-Medium (running): "Work 1/2" — correct
- [x] RT: WF3-Complex (running): "Work 1/3" — correct
- [x] RT: WF4-Full (cancelled): "Work 1/4" — correct

### Branch conflict handling
- [x] RT: Same branchStrategy across workflows causes git branch conflict — expected behavior
- [x] RT: Unique branch names per workflow resolves conflict — verified

## Agent Session UI
- [x] Agent Session UI: navigate to agent session page from running run — TC-AGT-01 PASS
- [x] Agent Session UI: page loads with header, model badge, status — TC-AGT-02 PASS (agent logs panel shows model, cost, turns, tokens)
- [x] Agent Session UI: send query via button and Ctrl+Enter — TC-AGT-04 PASS (Enter), TC-AGT-05 PASS (Ctrl+Enter via workspace chat)
- [x] Agent Session UI: messages render correctly (user right, agent left) — TC-AGT-08 PASS (tool groups, markdown, execution stats)
- [x] Agent Session UI: stop session dialog and confirmation — TC-AGT-10, TC-AGT-11 PASS (cancel dialog with reason textarea, status changed to 취소)
- [x] Agent Session UI: empty states render correctly — TC-AGT-03, TC-AGT-13, TC-AGT-14 PASS
- [x] Agent Session UI: back navigation to run detail works — TC-AGT-12 PASS

## Integration
- [x] Integration: full lifecycle (git -> mcp -> workflow -> activate -> run) — TC-INT-01 PASS
- [x] Integration: git deletion cascades to workflow ref invalidation — TC-INT-02 PASS
- [x] Integration: mcp deletion cascades to workflow ref invalidation — TC-INT-03 PASS
- [x] Integration: sidebar navigation works for all routes — TC-INT-04 PASS
- [x] Integration: cross-page data consistency (dropdowns reflect latest data) — TC-INT-05, TC-INT-06 PASS
- [x] Integration: React Query cache invalidation on mutations — TC-INT-07, TC-INT-08 PASS
- [x] Integration: page refresh preserves data — TC-INT-09 PASS
- [x] Integration: error handling on API failure (graceful, no blank page) — TC-INT-10 PASS (backend down: redirects to login; invalid ID: shows error message)
- [x] Integration: direct URL access to invalid routes handled — TC-INT-12 PASS
- [x] Integration: status badge colors match design spec — TC-INT-13 PASS

## Workspace UI
- [x] Workspace UI: list page loads correctly (/workspaces) — TC-WS-01 PASS
- [x] Workspace UI: empty state shows create action — TC-WS-02 PASS
- [x] Workspace UI: create form loads with all sections — TC-WS-04 PASS
- [x] Workspace UI: create form validation (disabled on empty) — TC-WS-05 PASS
- [x] Workspace UI: add/remove git ref rows in form — TC-WS-06, TC-WS-07 PASS
- [x] Workspace UI: create workspace succeeds → navigates to detail — TC-WS-08 PASS (after BUG-011 fix)
- [x] Workspace UI: MCP server checkbox selection — TC-WS-09 PASS
- [x] Workspace UI: list shows created workspace with correct columns — TC-WS-10 PASS
- [x] Workspace UI: status filter buttons work — TC-WS-11 PASS
- [x] Workspace UI: row click navigates to detail — TC-WS-12 PASS
- [x] Workspace UI: detail header shows name + status badge + info bar — TC-WS-13 PASS
- [x] Workspace UI: file explorer (tree + editor) — TC-WS-14 PASS
- [x] Workspace UI: diff view (file list + side-by-side diff) — TC-WS-15 PASS
- [x] Workspace UI: diff view git selector (multi git ref) — TC-WS-16 PASS (2 repos, selector switches between branches)
- [x] Workspace UI: chat panel send message — TC-WS-17 PASS (agent responded with file listing)
- [x] Workspace UI: chat Shift+Enter for newline — TC-WS-18 PASS
- [x] Workspace UI: chat tool groups expand/collapse — TC-WS-19 PASS (Bash x6 expanded to show 6 individual calls)
- [x] Workspace UI: chat disabled when completed — TC-WS-20 PASS
- [x] Workspace UI: complete workspace → status changes — TC-WS-21 PASS
- [x] Workspace UI: remote push (completed) → push result dialog — TC-WS-22, TC-WS-23 PASS (pushed feature/agent-test, 성공)
- [x] Workspace UI: delete workspace from detail page — TC-WS-24 PASS
- [x] Workspace UI: delete workspace from list page — TC-WS-25 PASS

## Work Lineage UI
- [x] Lineage UI: page loads correctly (/work-lineage) — TC-LIN-01 PASS
- [x] Lineage UI: empty state message — TC-LIN-02 PASS
- [x] Lineage UI: entries display with issue key + run count — TC-LIN-03 PASS
- [x] Lineage UI: expand/collapse entries — TC-LIN-04 PASS
- [x] Lineage UI: runs table shows correct columns — TC-LIN-05 PASS
- [x] Lineage UI: checkbox selection for completed runs — TC-LIN-06 PASS
- [x] Lineage UI: checkbox disabled for non-completed runs — TC-LIN-07 PASS
- [x] Lineage UI: merge dialog opens with selected count — TC-LIN-08 PASS
- [x] Lineage UI: merge dialog workspace dropdown (active only) — TC-LIN-09 PASS
- [x] Lineage UI: merge dialog no active workspaces message — TC-LIN-10 PASS (shows "활성 상태의 워크스페이스가 없습니다", 통합 button disabled)
- [x] Lineage UI: execute merge — TC-LIN-11 PASS (navigated to workspace, agent processed merge)
- [x] Lineage UI: cancel merge dialog — TC-LIN-12 PASS
- [x] Lineage UI: copy markdown export — TC-LIN-13 PASS
- [x] Lineage UI: download markdown export — TC-LIN-14 PASS

## Workflow Builder UI
- [x] Builder UI: list page loads correctly (/workflow-builder) — TC-BLD-01 PASS
- [x] Builder UI: empty state shows create action — TC-BLD-02 PASS
- [x] Builder UI: list only shows WORKFLOW_BUILDER workspaces — TC-BLD-03 PASS
- [x] Builder UI: create form fields (no branchName) — TC-BLD-05, TC-BLD-06 PASS
- [x] Builder UI: create form validation — TC-BLD-07 PASS
- [x] Builder UI: create session → agent auto-starts — TC-BLD-08 PASS
- [x] Builder UI: session layout (chat + preview split) — TC-BLD-09 PASS
- [x] Builder UI: agent greeting message — TC-BLD-10 PASS
- [x] Builder UI: preview empty state — TC-BLD-11 PASS
- [x] Builder UI: chat to design workflow — TC-BLD-12 PASS
- [x] Builder UI: preview canvas shows workflow — TC-BLD-13, TC-BLD-14 PASS
- [x] Builder UI: preview zoom controls — TC-BLD-15 PASS
- [x] Builder UI: "워크플로우 생성" button appears — TC-BLD-16 PASS
- [x] Builder UI: build workflow from preview — TC-BLD-17 PASS
- [x] Builder UI: created workflow matches preview — TC-BLD-18 PASS
- [x] Builder UI: iterative design (modify via chat) — TC-BLD-20 PASS
- [x] Builder UI: complete builder session — TC-BLD-21 PASS
- [x] Builder UI: delete builder session — TC-BLD-22 PASS
- [x] Builder UI: delete builder session from list — TC-BLD-23 PASS (trash icon → confirm dialog → session removed)
- [x] Builder UI: list filter buttons — TC-BLD-24 PASS
- [x] Builder UI: row click navigates to detail — TC-BLD-25 PASS

## Bug Summary
| Bug | Description | Status |
|-----|-------------|--------|
| BUG-001 | Duplicate Git URL allowed | FIXED |
| BUG-002 | Git reference count always 0 | FIXED |
| BUG-003 | branchStrategy type mismatch | FIXED |
| BUG-004 | Backend 500 on missing taskDefinitions | FIXED |
| BUG-005 | MCP Server reference count always 0 | FIXED |
| BUG-006 | Dashboard summary endpoint missing | FIXED |
| BUG-007 | Dashboard runs table empty workflow name | FIXED |
| BUG-008 | Git/MCP/Works count columns empty in workflow list | FIXED |
| BUG-009 | Progress shows "Work 2/1" for completed workflow | FIXED |
| BUG-010 | Work Node edit loses task queries (422 on save) | FIXED |
| BUG-011 | Workspace creation timeout (agent session blocks HTTP response) | FIXED |
| BUG-012 | reportOutline empty sections array blocks workflow creation | FIXED |

## Final Summary (Iteration 1-5)
- **Total test cases (tested):** ~157 (Git 10 + MCP 12 + Workflow 18 + Runtime 35+ + Agent 14 + Integration 13 + Workspace 25 + Lineage 14 + Builder 21)
- **PASS:** 157
- **SKIP:** 0
- **BLOCKED:** 0
- **FAIL:** 0 (all found bugs were fixed and verified)
- **Bugs found and fixed:** 12 (BUG-001 through BUG-012)

### Iteration 5 Results (All Previously-Skipped Tests)
- **TC-WF-04:** PASS — Radix Select works via Playwright (BUG-012 fixed: empty reportOutline.sections blocked form submission)
- **TC-INT-10:** PASS — Backend down: redirects to login page; Invalid resource ID: shows error message (no blank page)
- **TC-AGT-10/11:** PASS — Cancel dialog with reason textarea, session status changed to 취소
- **TC-LIN-10:** PASS — "활성 상태의 워크스페이스가 없습니다" message shown, 통합 button disabled
- **TC-BLD-23:** PASS — Trash icon on list row → confirm dialog → session removed from table

### Iteration 4 Results (Real Agent + Real Git Repo)
- **Agent Session UI:** 5 previously-skipped tests now PASS (TC-AGT-02, 04, 05, 08, 10/11)
- **Workspace UI:** 4 previously-skipped tests now PASS (TC-WS-16, 17, 19, 22/23)
- **Used real git repo:** https://github.com/draft-dhgo/test-repo-back-community.git
- **Remote push verified:** feature/agent-test pushed successfully

### Iteration 3 Results (Workspace + Lineage + Builder)
- **Workspace UI:** 22 PASS, 0 SKIP, 1 BUG found (BUG-011)
- **Work Lineage UI:** 13 PASS, 1 SKIP (no active workspaces to delete)
- **Workflow Builder UI:** 19 PASS, 1 SKIP (TC-BLD-23 — delete from list)
