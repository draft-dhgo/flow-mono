# Work Lineage UI Tests

## TC-LIN-01: Navigate to /work-lineage page
- **Preconditions:** Servers running, logged in
- **Steps:**
  1. Click "Lineage" in sidebar
- **Expected Result:** Page loads with heading "작업 리니지", export buttons, and lineage entries (or empty state)
- **Actual Result:**
- **Status:**

## TC-LIN-02: Empty state
- **Preconditions:** No workflow runs with issue keys exist
- **Steps:**
  1. Navigate to /work-lineage
- **Expected Result:** Shows "리니지 데이터가 없습니다" empty message
- **Actual Result:**
- **Status:**

## TC-LIN-03: Lineage entries display
- **Preconditions:** Workflow runs with issue keys exist (seedKeys used in workflows)
- **Steps:**
  1. Navigate to /work-lineage
- **Expected Result:** Expandable entries appear, each showing issue key header and run count badge (e.g., "TASK-123 3개 실행")
- **Actual Result:**
- **Status:**

## TC-LIN-04: Expand/collapse lineage entry
- **Preconditions:** Lineage entries exist
- **Steps:**
  1. Click on an issue key header
  2. Click again to collapse
- **Expected Result:** First click expands to show runs table; second click collapses
- **Actual Result:**
- **Status:**

## TC-LIN-05: Runs table content
- **Preconditions:** An entry is expanded
- **Steps:**
  1. Verify table columns: checkbox, 워크플로우, 상태, 프로젝트, 브랜치, 커밋 해시, 커밋 수
- **Expected Result:** Each run row shows workflow name, status badge, git project info, branch, commit hash (abbreviated), commit count
- **Actual Result:**
- **Status:**

## TC-LIN-06: Select completed runs (checkbox)
- **Preconditions:** Completed workflow runs exist in lineage
- **Steps:**
  1. Check the checkbox on a completed run
  2. Check another completed run
- **Expected Result:** Checkboxes enabled only for COMPLETED runs. "통합" button appears with count
- **Actual Result:**
- **Status:**

## TC-LIN-07: Checkbox disabled for non-completed runs
- **Preconditions:** Running/paused/cancelled runs exist in lineage
- **Steps:**
  1. Check if non-completed runs have checkboxes
- **Expected Result:** Checkboxes not shown or disabled for non-completed runs
- **Actual Result:**
- **Status:**

## TC-LIN-08: Open merge dialog
- **Preconditions:** At least one run selected via checkbox
- **Steps:**
  1. Click "통합 (N)" button
- **Expected Result:** MergeDialog opens with title "브랜치 통합", shows "{N}개의 워크플로우 런이 선택되었습니다", workspace dropdown
- **Actual Result:**
- **Status:**

## TC-LIN-09: Merge dialog — workspace dropdown
- **Preconditions:** MergeDialog open, at least one ACTIVE workspace exists
- **Steps:**
  1. Open workspace dropdown
  2. Select an active workspace
- **Expected Result:** Dropdown shows only ACTIVE workspaces. "통합" button becomes enabled after selection
- **Actual Result:**
- **Status:**

## TC-LIN-10: Merge dialog — no active workspaces
- **Preconditions:** MergeDialog open, no ACTIVE workspaces exist
- **Steps:**
  1. Check dialog content
- **Expected Result:** Shows message "활성 상태의 워크스페이스가 없습니다. 먼저 워크스페이스를 생성하세요."
- **Actual Result:**
- **Status:**

## TC-LIN-11: Execute merge
- **Preconditions:** MergeDialog open, workspace selected
- **Steps:**
  1. Click "통합" button
- **Expected Result:** Merge executed, dialog closes, success feedback
- **Actual Result:**
- **Status:**

## TC-LIN-12: Cancel merge dialog
- **Preconditions:** MergeDialog open
- **Steps:**
  1. Click "취소" button
- **Expected Result:** Dialog closes, no merge performed
- **Actual Result:**
- **Status:**

## TC-LIN-13: Copy markdown export
- **Preconditions:** Lineage data exists
- **Steps:**
  1. Click "마크다운 복사" button
- **Expected Result:** Lineage export copied to clipboard, button text changes to "복사됨!" for 2 seconds
- **Actual Result:**
- **Status:**

## TC-LIN-14: Download markdown export
- **Preconditions:** Lineage data exists
- **Steps:**
  1. Click "마크다운 다운로드" button
- **Expected Result:** File "work-lineage.md" downloaded with lineage content
- **Actual Result:**
- **Status:**
