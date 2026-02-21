import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorFallback } from '@/components/ErrorFallback';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WorkflowListPage } from '@/pages/WorkflowListPage';
import { GitManagementPage } from '@/pages/GitManagementPage';
import { McpServerManagementPage } from '@/pages/McpServerManagementPage';
import { WorkflowFlowEditorPage } from '@/pages/WorkflowFlowEditorPage';
import { WorkflowRunFlowPage } from '@/pages/WorkflowRunFlowPage';
import { WorkflowRunListPage } from '@/pages/WorkflowRunListPage';
import { WorkLineagePage } from '@/pages/WorkLineagePage';
import { WorkspaceListPage } from '@/pages/WorkspaceListPage';
import { WorkspaceCreatePage } from '@/pages/WorkspaceCreatePage';
import { WorkspaceDetailPage } from '@/pages/WorkspaceDetailPage';
import { WorkflowBuilderListPage } from '@/pages/WorkflowBuilderListPage';
import { WorkflowBuilderPage } from '@/pages/WorkflowBuilderPage';

export default function App() {
  return (
    <BrowserRouter>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary onReset={reset} fallback={ErrorFallback}>
            <Routes>
              {/* 공개 라우트 */}
              <Route path="/login" element={<LoginPage />} />

              {/* 보호된 라우트 */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/workflows" element={<WorkflowListPage />} />
                  <Route path="/workflows/new" element={<WorkflowFlowEditorPage />} />
                  <Route path="/workflows/:id" element={<WorkflowFlowEditorPage />} />
                  <Route path="/workflows/:id/edit" element={<WorkflowFlowEditorPage />} />
                  <Route path="/gits" element={<GitManagementPage />} />
                  <Route path="/mcp-servers" element={<McpServerManagementPage />} />
                  <Route path="/workflow-runs" element={<WorkflowRunListPage />} />
                  <Route path="/workflow-runs/:id" element={<WorkflowRunFlowPage />} />
                  <Route path="/workspaces" element={<WorkspaceListPage />} />
                  <Route path="/workspaces/new" element={<WorkspaceCreatePage />} />
                  <Route path="/workspaces/:id" element={<WorkspaceDetailPage />} />
                  <Route path="/workflow-builder" element={<WorkflowBuilderListPage />} />
                  <Route path="/workflow-builder/new" element={<WorkflowBuilderPage />} />
                  <Route path="/workflow-builder/:id" element={<WorkflowBuilderPage />} />
                  <Route path="/work-lineage" element={<WorkLineagePage />} />
                </Route>
              </Route>
            </Routes>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </BrowserRouter>
  );
}
