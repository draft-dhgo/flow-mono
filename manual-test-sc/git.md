# Git Repository Management UI Tests

## TC-GIT-01: Navigate to /gits page
- **Preconditions:** Servers running (backend :3000, frontend :5173)
- **Steps:**
  1. Navigate to http://localhost:5173/gits
- **Expected Result:** Page loads with header ("Git 저장소 관리" or similar) and a table (possibly empty)
- **Actual Result:** Page loaded successfully with header "Git 저장소 관리", sidebar navigation (Dashboard, Workflows, Git, MCP Servers), and empty state message "등록된 Git 저장소가 없습니다." with a "저장소 등록" button.
- **Status:** PASS

## TC-GIT-02: Click "저장소 등록" button
- **Preconditions:** On /gits page
- **Steps:**
  1. Click the "저장소 등록" button
- **Expected Result:** A register dialog/modal opens with form fields (URL, Local Path, etc.)
- **Actual Result:** Register dialog opened with title "Git 저장소 등록", subtitle "새 Git 저장소를 등록합니다.", form fields for URL (placeholder: "git@github.com:org/repo.git") and Local Path (placeholder: "my-org/my-repo"), and buttons "취소" and "등록". Validation messages "URL은 필수입니다" and "Local path는 필수입니다" are already visible.
- **Status:** PASS

## TC-GIT-03: Submit empty form
- **Preconditions:** Register dialog is open
- **Steps:**
  1. Click submit/register without filling any fields
- **Expected Result:** Validation errors appear for required fields (URL, Local Path)
- **Actual Result:** Clicking "등록" with empty fields shows validation errors: "URL은 필수입니다" and "Local path는 필수입니다". Form submission is blocked.
- **Status:** PASS

## TC-GIT-04: Register git repo with valid URL and local path
- **Preconditions:** Register dialog is open
- **Steps:**
  1. Enter a valid Git URL (e.g., https://github.com/test/repo.git)
  2. Enter a valid local path (e.g., /tmp/test-repo)
  3. Click submit/register
- **Expected Result:** Success — dialog closes, repo appears in the table
- **Actual Result:** Entered URL "https://github.com/octocat/Hello-World.git" and relative local path "test/repo". Clicked "등록". Dialog closed successfully and the repo appeared in the table with columns: URL ("https://github.com/octocat/Hello-World.git"), Local Path ("test/repo"), 참조 ("0"). Note: Initial attempt with fake URL "https://github.com/test/repo.git" correctly returned error "Failed to clone Git repository" (400 Bad Request) since backend validates by cloning. Succeeded with a real public repository.
- **Status:** PASS

## TC-GIT-05: Register git repo with duplicate URL
- **Preconditions:** A git repo is already registered with URL from TC-GIT-04
- **Steps:**
  1. Open register dialog
  2. Enter the same URL as TC-GIT-04
  3. Enter a different local path
  4. Click submit/register
- **Expected Result:** Error message indicating duplicate URL
- **Actual Result:** After BUG-001 fix: Backend now returns `GIT_DUPLICATE_URL` error when attempting to register a duplicate URL. Dialog shows error message, form submission is blocked.
- **Status:** PASS (after BUG-001 fix)

## TC-GIT-06: Verify registered repo shows correct columns
- **Preconditions:** At least one repo registered
- **Steps:**
  1. Check the table row for the registered repo
- **Expected Result:** Table shows URL, Local Path, Reference Count (0) columns
- **Actual Result:** Table displays columns: URL, Local Path, 참조 (Reference Count), and an action column with a delete button. Each registered repo row shows URL, local path, and reference count "0". Matches expected result.
- **Status:** PASS

## TC-GIT-07: Delete unreferenced repo
- **Preconditions:** A repo exists with Reference Count = 0
- **Steps:**
  1. Click delete button on the unreferenced repo
  2. Confirm deletion in the confirmation dialog
- **Expected Result:** Repo is removed from the table
- **Actual Result:** Clicked delete button (dropdown menu with "삭제" option). A confirmation dialog appeared with title "저장소 삭제" and message "이 저장소를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다." with "취소" and "삭제" buttons. After clicking "삭제", the repo was removed from the table. Only the original repo remains.
- **Status:** PASS

## TC-GIT-08: Attempt delete on repo referenced by a workflow
- **Preconditions:** A repo exists that is referenced by at least one workflow
- **Steps:**
  1. Click delete button on the referenced repo
- **Expected Result:** Blocking dialog appears, delete action is disabled or blocked
- **Actual Result:** After BUG-002 fix: Reference count correctly shows the number of workflows referencing the git repo. When refCount > 0, a blocking dialog appears showing referencing workflow names and the delete button is disabled.
- **Status:** PASS (after BUG-002 fix)

## TC-GIT-09: After deleting a repo referenced by workflow
- **Preconditions:** Repo was successfully force-deleted or reference was removed
- **Steps:**
  1. Check the workflow that referenced the deleted repo
- **Expected Result:** Workflow's git ref is invalidated
- **Actual Result:** SKIPPED - Cannot properly test this scenario because TC-GIT-08 revealed that reference count is always 0 (BUG-002). The delete blocking mechanism never activates, so there is no "force-delete" path to test. The precondition (a repo that was force-deleted or had its reference removed) cannot be properly established through the UI.
- **Status:** SKIP

## TC-GIT-10: Refresh /gits page
- **Preconditions:** At least one repo registered
- **Steps:**
  1. Press F5 or navigate away and back to /gits
- **Expected Result:** Data persists — previously registered repos still visible
- **Actual Result:** After navigating away and back to /gits, and after a full page reload (F5), both registered repos are still visible in the table with correct data. Data persists across navigation and page refreshes.
- **Status:** PASS
