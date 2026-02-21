import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorFallback } from '@/components/ErrorFallback';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WorkflowListPage } from '@/pages/WorkflowListPage';
import { GitManagementPage } from '@/pages/GitManagementPage';
import { McpServerManagementPage } from '@/pages/McpServerManagementPage';
import { WorkflowRunListPage } from '@/pages/WorkflowRunListPage';
import { WorkspaceListPage } from '@/pages/WorkspaceListPage';
import { WorkspaceCreatePage } from '@/pages/WorkspaceCreatePage';
import { WorkflowBuilderListPage } from '@/pages/WorkflowBuilderListPage';

const WorkflowFlowEditorPage = lazy(() =>
  import('@/pages/WorkflowFlowEditorPage').then((m) => ({ default: m.WorkflowFlowEditorPage })),
);
const WorkflowRunFlowPage = lazy(() =>
  import('@/pages/WorkflowRunFlowPage').then((m) => ({ default: m.WorkflowRunFlowPage })),
);
const WorkspaceDetailPage = lazy(() =>
  import('@/pages/WorkspaceDetailPage').then((m) => ({ default: m.WorkspaceDetailPage })),
);
const WorkflowBuilderPage = lazy(() =>
  import('@/pages/WorkflowBuilderPage').then((m) => ({ default: m.WorkflowBuilderPage })),
);
const WorkLineagePage = lazy(() =>
  import('@/pages/WorkLineagePage').then((m) => ({ default: m.WorkLineagePage })),
);

function LazyFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner />
    </div>
  );
}

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
                  <Route path="/workflows/new" element={<Suspense fallback={<LazyFallback />}><WorkflowFlowEditorPage /></Suspense>} />
                  <Route path="/workflows/:id" element={<Suspense fallback={<LazyFallback />}><WorkflowFlowEditorPage /></Suspense>} />
                  <Route path="/workflows/:id/edit" element={<Suspense fallback={<LazyFallback />}><WorkflowFlowEditorPage /></Suspense>} />
                  <Route path="/gits" element={<GitManagementPage />} />
                  <Route path="/mcp-servers" element={<McpServerManagementPage />} />
                  <Route path="/workflow-runs" element={<WorkflowRunListPage />} />
                  <Route path="/workflow-runs/:id" element={<Suspense fallback={<LazyFallback />}><WorkflowRunFlowPage /></Suspense>} />
                  <Route path="/workspaces" element={<WorkspaceListPage />} />
                  <Route path="/workspaces/new" element={<WorkspaceCreatePage />} />
                  <Route path="/workspaces/:id" element={<Suspense fallback={<LazyFallback />}><WorkspaceDetailPage /></Suspense>} />
                  <Route path="/workflow-builder" element={<WorkflowBuilderListPage />} />
                  <Route path="/workflow-builder/new" element={<Suspense fallback={<LazyFallback />}><WorkflowBuilderPage /></Suspense>} />
                  <Route path="/workflow-builder/:id" element={<Suspense fallback={<LazyFallback />}><WorkflowBuilderPage /></Suspense>} />
                  <Route path="/work-lineage" element={<Suspense fallback={<LazyFallback />}><WorkLineagePage /></Suspense>} />
                </Route>
              </Route>
            </Routes>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </BrowserRouter>
  );
}
