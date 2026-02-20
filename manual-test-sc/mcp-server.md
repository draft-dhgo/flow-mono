# MCP Server Management UI Tests

## TC-MCP-01: Navigate to /mcp-servers page
- **Preconditions:** Servers running
- **Steps:**
  1. Navigate to http://localhost:5173/mcp-servers
- **Expected Result:** Page loads with header and a table (possibly empty)
- **Actual Result:** Page loaded successfully with header "MCP 서버 관리", a "서버 등록" button, and a table with columns: Name, Transport, Command / URL, 참조 (Reference Count). Table shows existing registered servers (Test SSE Server with SSE badge, Test Streamable Server with STREAMABLE_HTTP badge).
- **Status:** PASS

## TC-MCP-02: Click "서버 등록" button
- **Preconditions:** On /mcp-servers page
- **Steps:**
  1. Click the "서버 등록" button
- **Expected Result:** A register dialog/modal opens with form fields
- **Actual Result:** Register dialog opened with title "MCP 서버 등록", subtitle "새 MCP 서버를 등록합니다." Form fields: 이름 (Name), Command, Arguments section with "인자 추가" button, Environment Variables section with "환경변수 추가" button, Transport Type radio group (STDIO selected by default, SSE, STREAMABLE_HTTP), URL field (disabled for STDIO with placeholder "STDIO 모드에서는 불필요"), and buttons "취소" and "등록".
- **Status:** PASS

## TC-MCP-03: Submit empty form
- **Preconditions:** Register dialog is open
- **Steps:**
  1. Click submit without filling any fields
- **Expected Result:** Validation errors for required fields (Name, Command)
- **Actual Result:** Clicking "등록" with empty fields shows validation errors: "이름은 필수입니다" and "Command는 필수입니다". Form submission is blocked. Note: URL field validation is not shown because it's disabled for the default STDIO transport type.
- **Status:** PASS

## TC-MCP-04: Register STDIO server
- **Preconditions:** Register dialog is open
- **Steps:**
  1. Select transport type: STDIO
  2. Enter name (e.g., "Test STDIO Server")
  3. Enter command (e.g., "npx")
  4. Add args (e.g., ["-y", "some-mcp-server"])
  5. Add env (e.g., key="API_KEY", value="test123")
  6. Click submit
- **Expected Result:** Success — server appears in table with STDIO badge
- **Actual Result:** Filled form with name "Test STDIO Server", command "npx", args ["-y", "some-mcp-server"], env API_KEY=test123, transport STDIO (default, URL disabled). Clicked "등록". Server successfully created and appears in table with STDIO badge, showing "npx -y some-mcp-server" in Command/URL column and reference count 0. Note: After successful registration, page unexpectedly navigated to /workflows/new, but navigating back to /mcp-servers confirmed the server was created.
- **Status:** PASS

## TC-MCP-05: Register SSE server
- **Preconditions:** Register dialog is open
- **Steps:**
  1. Select transport type: SSE
  2. Enter name (e.g., "Test SSE Server")
  3. Enter command (e.g., "node server.js")
  4. Enter URL (e.g., "http://localhost:8080/sse")
  5. Click submit
- **Expected Result:** Success — server appears in table with SSE badge
- **Actual Result:** Selected SSE transport type, filled name "Test SSE Server 2", command "node server.js", URL "http://localhost:8080/sse". Clicked "등록". Server successfully created and appears in table with SSE badge, showing URL in Command/URL column and reference count 0.
- **Status:** PASS

## TC-MCP-06: Register STREAMABLE_HTTP server
- **Preconditions:** Register dialog is open
- **Steps:**
  1. Select transport type: STREAMABLE_HTTP
  2. Enter name (e.g., "Test Streamable Server")
  3. Enter command (e.g., "node server.js")
  4. Enter URL (e.g., "http://localhost:8081/stream")
  5. Click submit
- **Expected Result:** Success — server appears in table with STREAMABLE_HTTP badge
- **Actual Result:** Selected STREAMABLE_HTTP transport type, filled name "Test Streamable Server 2", command "node server.js", URL "http://localhost:8081/stream". Clicked "등록". Server successfully created and appears in table with STREAMABLE_HTTP badge (purple), showing URL in Command/URL column and reference count 0.
- **Status:** PASS

## TC-MCP-07: Register SSE server without URL
- **Preconditions:** Register dialog is open
- **Steps:**
  1. Select transport type: SSE
  2. Enter name and command but leave URL empty
  3. Click submit
- **Expected Result:** Validation error for URL field
- **Actual Result:** Selected SSE transport type, filled name "No URL SSE Server" and command "node server.js", left URL empty. Clicked "등록". Validation error appeared: "SSE/STREAMABLE_HTTP 타입은 URL이 필수입니다". Form submission was blocked.
- **Status:** PASS

## TC-MCP-08: Verify table columns
- **Preconditions:** At least one server registered
- **Steps:**
  1. Check the table for registered servers
- **Expected Result:** Table shows Name, Transport Type badge, Command/URL, Reference Count columns
- **Actual Result:** Table shows 5 registered servers with proper columns: Name (text), Transport (badge - STDIO gray, SSE blue, STREAMABLE_HTTP purple), Command/URL (STDIO shows "command args" concatenated e.g. "npx -y some-mcp-server"; SSE/STREAMABLE_HTTP show URL), 참조 (Reference Count, all showing "0"), and an actions column with a dropdown menu button. All columns are correctly populated.
- **Status:** PASS

## TC-MCP-09: Delete unreferenced server
- **Preconditions:** A server exists with Reference Count = 0
- **Steps:**
  1. Click delete on the unreferenced server
  2. Confirm deletion
- **Expected Result:** Server is removed from the table
- **Actual Result:** Clicked actions dropdown on "Test Streamable Server 2" (refCount=0), selected "해제". Confirmation dialog appeared: "서버 해제" with message "Test Streamable Server 2 서버를 해제하시겠습니까? 이 작업은 되돌릴 수 없습니다." with "취소" and "해제" buttons. Clicked "해제". Server was removed from the table (5 rows -> 4 rows).
- **Status:** PASS

## TC-MCP-10: Attempt delete on server referenced by workflow
- **Preconditions:** A server is referenced by at least one workflow
- **Steps:**
  1. Click delete on the referenced server
- **Expected Result:** Blocking dialog appears, delete disabled
- **Actual Result:** After BUG-005 fix: Reference count correctly shows the number of workflows referencing the MCP server. When refCount > 0, a blocking dialog ("해제 불가") appears showing referencing workflow names and the "해제" button is disabled.
- **Status:** PASS (after BUG-005 fix)

## TC-MCP-11: Add/remove dynamic argument fields
- **Preconditions:** Register dialog is open
- **Steps:**
  1. Click "Add argument" button
  2. Verify a new argument input field appears
  3. Click "Remove" on the argument field
  4. Verify the field is removed
- **Expected Result:** Dynamic array field behavior works correctly for args
- **Actual Result:** Opened register dialog. Initially 0 arg fields. Clicked "인자 추가" - 1 arg input appeared. Clicked again - 2 arg inputs. Filled with "first-arg" and "second-arg". Clicked X on first arg - 1 arg input remained with value "second-arg" (correct removal and reindex). Clicked X on remaining arg - 0 arg inputs. Dynamic array field behavior works correctly for arguments.
- **Status:** PASS

## TC-MCP-12: Add/remove dynamic env key-value fields
- **Preconditions:** Register dialog is open
- **Steps:**
  1. Click "Add env" button
  2. Verify new key-value input fields appear
  3. Click "Remove" on the env field
  4. Verify the fields are removed
- **Expected Result:** Dynamic array field behavior works correctly for env
- **Actual Result:** In the register dialog, clicked "환경변수 추가" - a key-value pair (Key input + Value input) appeared. Clicked again - second pair appeared. Filled with MY_KEY=my_value and OTHER_KEY=other_value. Clicked X on first env entry - 1 entry remained with key "OTHER_KEY" (correct removal and reindex). Clicked X on remaining entry - all entries removed. Dynamic array field behavior works correctly for environment variables.
- **Status:** PASS
