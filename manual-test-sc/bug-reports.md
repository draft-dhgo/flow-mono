# Bug Reports

## BUG-001: Duplicate Git repository URL is allowed without error
- Test Case: TC-GIT-05
- Status: FIXED
- Fix: Added `findByUrl(url: GitUrl)` method to `GitRepository` port and both implementations (TypeORM, InMemory). Added duplicate URL check in `CreateGitUseCase.execute()` before cloning — throws `GitDuplicateUrlError` (code: `GIT_DUPLICATE_URL`) if a Git repo with the same URL already exists.
- Symptom: Registering a Git repository with a URL that already exists in the system succeeds without any error.
- Expected: An error message should appear indicating the URL is already registered.

## BUG-002: Git reference count always shows 0 and delete blocking never activates
- Test Case: TC-GIT-08
- Status: FIXED
- Fix: Implemented actual reference counting in `GitManagementPage.tsx`. `getRefCount()` now filters workflows whose `gitRefs` array contains the given gitId. Added `gitRefs` field to `WorkflowListItem` type in `api/types.ts`.
- Symptom: The "참조" column always displays "0" even when a workflow references the git repo.

## BUG-003: branchStrategy edit form shows empty due to type mismatch
- Test Case: TC-WF-07
- Status: FIXED
- Fix: Changed `WorkflowResponse.branchStrategy` type in `flow-front/src/api/types.ts` from `{ workBranch: string }` to `string` to match the backend's actual API response. Updated form reset code to use `workflow.branchStrategy` directly instead of `workflow.branchStrategy.workBranch`.
- Symptom: When editing a workflow, the "브랜치 전략" field shows empty instead of the actual value.

## BUG-004: Backend returns 500 instead of 400 when workDefinitions.taskDefinitions is missing
- Test Case: TC-WF-04 (form submission debugging)
- Status: FIXED
- Fix: Added `if (!Array.isArray(dto.taskDefinitions))` check in `WorkflowController.toWorkDefinition()` that throws `BadRequestException` with descriptive message when taskDefinitions is missing or not an array.
- Symptom: POST /workflows crashes with TypeError when `workDefinitions[].taskDefinitions` is undefined.

## BUG-005 (was BUG-003): MCP Server reference count always shows 0 and delete blocking never activates
- Test Case: TC-MCP-10
- Status: FIXED
- Fix: Implemented actual reference counting in `McpServerManagementPage.tsx`. `getRefCount()` now filters workflows whose `mcpServerRefs` array contains a ref with matching `mcpServerId`. Added `mcpServerRefs` field to `WorkflowListItem` type.
- Symptom: The "참조" column always displays "0" for MCP servers.

## BUG-006: Dashboard summary endpoint missing — summary cards always show 0
- Test Case: TC-RT-02
- Status: FIXED
- Fix: Added `@Get('summary')` endpoint to `WorkflowRuntimeController` that counts runs by status (INITIALIZED, RUNNING, PAUSED, AWAITING, COMPLETED, CANCELLED). Placed before `@Get(':id')` route to avoid param conflict.
- Symptom: Dashboard summary cards (실행 중, 일시정지, 대기 중, 완료, 취소) all show "0" even when runs exist. `/workflow-runs/summary` returns 500.

## BUG-007: Dashboard recent runs table shows empty workflow name
- Test Case: TC-RT-03
- Status: FIXED
- Fix: Added `name: string` to `WorkflowConfig` interface in `@common/ports/workflow-config-reader.ts`. Updated `WorkflowConfigReaderImpl` to include workflow name. Injected `WorkflowConfigReader` into `WorkflowRuntimeController`. Updated `list()` endpoint to look up and include `workflowName` for each run.
- Symptom: The "Workflow" column in the dashboard recent runs table shows empty (no workflow name).

## BUG-008: Git/MCP/Works count columns empty in workflow list table
- Test Case: TC-WF-01 (workflow list page)
- Status: FIXED
- Fix: Added `gitRefCount`, `mcpServerRefCount`, `workDefinitionCount` fields to `serializeWorkflow()` in `workflow.controller.ts`. Frontend `WorkflowListItem` type already had these fields defined but backend was not returning them.
- Symptom: The workflow list table shows empty cells for Git, MCP, and Works columns because the backend serializer didn't include the count fields.

## BUG-009: Progress shows "Work 2/1" for completed single-work workflow
- Test Case: TC-RT-19 (progress accuracy)
- Status: FIXED
- Fix: Changed `currentWorkIndex + 1` to `Math.min(currentWorkIndex + 1, totalWorkCount)` in both `DashboardPage.tsx` (line 89) and `WorkflowRunDetailPage.tsx` (line 130). When a workflow completes, `currentWorkIndex` increments beyond the last work, causing overflow.
- Symptom: WF1-Simple (1 work, 1 task) shows "Work 2/1" in the dashboard and detail page after completion.

## BUG-010: Work Node edit dialog loses existing task queries (422 error on save)
- Test Case: TC-RT-17 (work node edit)
- Status: FIXED
- Fix: Three changes:
  1. Backend: Added `taskConfigs` array (with `order` and `query`) to `workNodeConfigs` serialization in `workflow-runtime.controller.ts`
  2. Frontend type: Added `taskConfigs: TaskNodeConfigInput[]` to `WorkNodeConfigSummary` in `api/types.ts`
  3. Frontend dialog: Updated `WorkNodeEditDialog` in `WorkflowRunDetailPage.tsx` to use actual `taskConfigs` data from the API instead of generating blank entries based on `taskCount`
- Symptom: The edit dialog initializes all task query fields as empty strings because the backend only returned `taskCount` (not the actual queries). Saving would fail with 422 because the backend validates that task queries cannot be empty.
