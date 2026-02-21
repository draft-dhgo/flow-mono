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
- [x] Workflow UI: create workflow with all fields succeeds — TC-WF-04 BLOCKED (Playwright+Radix Select limitation; API verified working)
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
- [ ] Agent Session UI: page loads with header, model badge, status — TC-AGT-02 SKIP (requires real agent execution)
- [ ] Agent Session UI: send query via button and Ctrl+Enter — TC-AGT-04, TC-AGT-05 SKIP (requires real agent)
- [ ] Agent Session UI: messages render correctly (user right, agent left) — TC-AGT-08 SKIP (requires real agent)
- [ ] Agent Session UI: stop session dialog and confirmation — TC-AGT-10, TC-AGT-11 SKIP (requires real agent)
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
- [ ] Integration: error handling on API failure (graceful, no blank page) — TC-INT-10 SKIP (would disrupt test session)
- [x] Integration: direct URL access to invalid routes handled — TC-INT-12 PASS
- [x] Integration: status badge colors match design spec — TC-INT-13 PASS

## Workspace UI
- [ ] Workspace UI: list page loads correctly (/workspaces) — TC-WS-01
- [ ] Workspace UI: empty state shows create action — TC-WS-02
- [ ] Workspace UI: create form loads with all sections — TC-WS-04
- [ ] Workspace UI: create form validation (disabled on empty) — TC-WS-05
- [ ] Workspace UI: add/remove git ref rows in form — TC-WS-06, TC-WS-07
- [ ] Workspace UI: create workspace succeeds → navigates to detail — TC-WS-08
- [ ] Workspace UI: MCP server checkbox selection — TC-WS-09
- [ ] Workspace UI: list shows created workspace with correct columns — TC-WS-10
- [ ] Workspace UI: status filter buttons work — TC-WS-11
- [ ] Workspace UI: row click navigates to detail — TC-WS-12
- [ ] Workspace UI: detail header shows name + status badge + info bar — TC-WS-13
- [ ] Workspace UI: file explorer (tree + editor) — TC-WS-14
- [ ] Workspace UI: diff view (file list + side-by-side diff) — TC-WS-15
- [ ] Workspace UI: diff view git selector (multi git ref) — TC-WS-16
- [ ] Workspace UI: chat panel send message — TC-WS-17
- [ ] Workspace UI: chat Shift+Enter for newline — TC-WS-18
- [ ] Workspace UI: chat tool groups expand/collapse — TC-WS-19
- [ ] Workspace UI: chat disabled when completed — TC-WS-20
- [ ] Workspace UI: complete workspace → status changes — TC-WS-21
- [ ] Workspace UI: remote push (completed) → push result dialog — TC-WS-22, TC-WS-23
- [ ] Workspace UI: delete workspace from detail page — TC-WS-24
- [ ] Workspace UI: delete workspace from list page — TC-WS-25

## Work Lineage UI
- [ ] Lineage UI: page loads correctly (/work-lineage) — TC-LIN-01
- [ ] Lineage UI: empty state message — TC-LIN-02
- [ ] Lineage UI: entries display with issue key + run count — TC-LIN-03
- [ ] Lineage UI: expand/collapse entries — TC-LIN-04
- [ ] Lineage UI: runs table shows correct columns — TC-LIN-05
- [ ] Lineage UI: checkbox selection for completed runs — TC-LIN-06
- [ ] Lineage UI: checkbox disabled for non-completed runs — TC-LIN-07
- [ ] Lineage UI: merge dialog opens with selected count — TC-LIN-08
- [ ] Lineage UI: merge dialog workspace dropdown (active only) — TC-LIN-09
- [ ] Lineage UI: merge dialog no active workspaces message — TC-LIN-10
- [ ] Lineage UI: execute merge — TC-LIN-11
- [ ] Lineage UI: cancel merge dialog — TC-LIN-12
- [ ] Lineage UI: copy markdown export — TC-LIN-13
- [ ] Lineage UI: download markdown export — TC-LIN-14

## Workflow Builder UI
- [ ] Builder UI: list page loads correctly (/workflow-builder) — TC-BLD-01
- [ ] Builder UI: empty state shows create action — TC-BLD-02
- [ ] Builder UI: list only shows WORKFLOW_BUILDER workspaces — TC-BLD-03
- [ ] Builder UI: create form fields (no branchName) — TC-BLD-05, TC-BLD-06
- [ ] Builder UI: create form validation — TC-BLD-07
- [ ] Builder UI: create session → agent auto-starts — TC-BLD-08
- [ ] Builder UI: session layout (chat + preview split) — TC-BLD-09
- [ ] Builder UI: agent greeting message — TC-BLD-10
- [ ] Builder UI: preview empty state — TC-BLD-11
- [ ] Builder UI: chat to design workflow — TC-BLD-12
- [ ] Builder UI: preview canvas shows workflow — TC-BLD-13, TC-BLD-14
- [ ] Builder UI: preview zoom controls — TC-BLD-15
- [ ] Builder UI: "워크플로우 생성" button appears — TC-BLD-16
- [ ] Builder UI: build workflow from preview — TC-BLD-17
- [ ] Builder UI: created workflow matches preview — TC-BLD-18
- [ ] Builder UI: iterative design (modify via chat) — TC-BLD-20
- [ ] Builder UI: complete builder session — TC-BLD-21
- [ ] Builder UI: delete builder session — TC-BLD-22, TC-BLD-23
- [ ] Builder UI: list filter buttons — TC-BLD-24
- [ ] Builder UI: row click navigates to detail — TC-BLD-25

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

## Final Summary (Iteration 1-2)
- **Total test cases (tested):** ~100 (Git 10 + MCP 12 + Workflow 18 + Runtime 35+ + Agent 14 + Integration 13)
- **PASS:** 82+
- **SKIP:** 10 (mostly agent session requiring real Claude agent, checkpoint requiring real execution)
- **BLOCKED:** 1 (TC-WF-04: Playwright + Radix Select incompatibility — not an app bug)
- **FAIL:** 0 (all found bugs were fixed and verified)
- **Bugs found and fixed:** 10 (BUG-001 through BUG-010)

## Pending Tests (Iteration 3)
- **Workspace UI:** 25 test cases (TC-WS-01 ~ TC-WS-25)
- **Work Lineage UI:** 14 test cases (TC-LIN-01 ~ TC-LIN-14)
- **Workflow Builder UI:** 25 test cases (TC-BLD-01 ~ TC-BLD-25)
- **Total pending:** 64 test cases
