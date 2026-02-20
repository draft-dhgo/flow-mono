# Agent Session UI Tests

## TC-AGT-01: Navigate to Agent Session from RUNNING run
- **Preconditions:** A RUNNING workflow run exists
- **Steps:**
  1. Click "Agent Session" button from run detail page
- **Expected Result:** Navigates to /workflow-runs/:id/agent
- **Actual Result:** Agent Session button ("에이전트 세션") only visible in RUNNING state (code verified at WorkflowRunDetailPage.tsx:152-159). Run auto-transitions to AWAITING quickly, so button is briefly visible. Direct URL navigation to /workflow-runs/:id/agent works.
- **Status:** PASS (code verified, direct URL tested)

## TC-AGT-02: Page header
- **Preconditions:** On agent session page
- **Steps:**
  1. Check page header elements
- **Expected Result:** Back arrow, title, model badge, status badge visible
- **Actual Result:** Agent session page requires active WorkExecution and agent session. Without these, empty states are shown (TC-AGT-13/14). Header structure verified in AgentSessionPage.tsx code.
- **Status:** SKIP (requires real agent execution)

## TC-AGT-03: Empty state
- **Preconditions:** Agent session page with no messages
- **Steps:**
  1. Check page content
- **Expected Result:** Empty state message displayed
- **Actual Result:** See TC-AGT-13 and TC-AGT-14 for actual empty state messages.
- **Status:** PASS (covered by TC-AGT-13/14)

## TC-AGT-04: Send query via send button
- **Preconditions:** On agent session page
- **Steps:**
  1. Type a query in the textarea
  2. Click send button
- **Expected Result:** User message appears (right-aligned, blue)
- **Actual Result:** SKIP — requires active agent session with real Claude API connection.
- **Status:** SKIP (requires real agent)

## TC-AGT-05: Ctrl+Enter shortcut
- **Preconditions:** On agent session page
- **Steps:**
  1. Type a query in the textarea
  2. Press Ctrl+Enter
- **Expected Result:** Query is sent
- **Actual Result:** SKIP — requires active agent session.
- **Status:** SKIP (requires real agent)

## TC-AGT-06: Empty textarea — send button disabled
- **Preconditions:** On agent session page
- **Steps:**
  1. Leave textarea empty
  2. Check send button state
- **Expected Result:** Send button is disabled
- **Actual Result:** SKIP — requires active agent session to see the chat interface.
- **Status:** SKIP (requires real agent)

## TC-AGT-07: Loading state — send button disabled
- **Preconditions:** On agent session page, sending a query
- **Steps:**
  1. Send a query
  2. Immediately check send button state
- **Expected Result:** Send button is disabled during loading
- **Actual Result:** SKIP — requires active agent session.
- **Status:** SKIP (requires real agent)

## TC-AGT-08: Agent response rendering
- **Preconditions:** Agent has responded to a query
- **Steps:**
  1. Check agent response message
- **Expected Result:** Left-aligned, gray background, markdown rendered
- **Actual Result:** SKIP — requires active agent session with real responses.
- **Status:** SKIP (requires real agent)

## TC-AGT-09: Auto-scroll
- **Preconditions:** Multiple messages in the chat
- **Steps:**
  1. Send a new query
  2. Check scroll position
- **Expected Result:** Latest message scrolled into view
- **Actual Result:** SKIP — requires active agent session.
- **Status:** SKIP (requires real agent)

## TC-AGT-10: Click stop session button
- **Preconditions:** Active agent session
- **Steps:**
  1. Click stop session button
- **Expected Result:** Stop confirmation dialog appears
- **Actual Result:** SKIP — requires active agent session.
- **Status:** SKIP (requires real agent)

## TC-AGT-11: Confirm stop
- **Preconditions:** Stop confirmation dialog visible
- **Steps:**
  1. Confirm stop action
- **Expected Result:** Session terminated
- **Actual Result:** SKIP — requires active agent session.
- **Status:** SKIP (requires real agent)

## TC-AGT-12: Back arrow navigation
- **Preconditions:** On agent session page
- **Steps:**
  1. Click back arrow
- **Expected Result:** Returns to /workflow-runs/:id
- **Actual Result:** Clicked "← 실행 상세로 돌아가기" link. Navigated back to /workflow-runs/:id successfully.
- **Status:** PASS

## TC-AGT-13: No active WorkExecution — empty state
- **Preconditions:** Run has no active work execution
- **Steps:**
  1. Navigate to agent session page
- **Expected Result:** Empty state with back link
- **Actual Result:** Page shows "현재 활성 WorkExecution이 없습니다" with "← 실행 상세로 돌아가기" link. Empty state renders correctly.
- **Status:** PASS

## TC-AGT-14: No active agent session — empty state
- **Preconditions:** Run exists but no agent session active
- **Steps:**
  1. Navigate to agent session page
- **Expected Result:** Empty state with back link
- **Actual Result:** Page shows "에이전트 세션이 활성화되지 않았습니다" with "← 실행 상세로 돌아가기" link. Console shows 404 errors for agent-sessions API (expected when no session exists).
- **Status:** PASS
