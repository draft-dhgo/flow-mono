import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorFallback } from '@/components/ErrorFallback';
import { DashboardPage } from '@/pages/DashboardPage';
import { WorkflowListPage } from '@/pages/WorkflowListPage';
import { GitManagementPage } from '@/pages/GitManagementPage';
import { McpServerManagementPage } from '@/pages/McpServerManagementPage';
import { WorkflowFlowEditorPage } from '@/pages/WorkflowFlowEditorPage';
import { WorkflowRunFlowPage } from '@/pages/WorkflowRunFlowPage';
import { WorkflowRunListPage } from '@/pages/WorkflowRunListPage';

export default function App() {
  return (
    <BrowserRouter>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary onReset={reset} fallback={ErrorFallback}>
            <Routes>
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
              </Route>
            </Routes>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </BrowserRouter>
  );
}
