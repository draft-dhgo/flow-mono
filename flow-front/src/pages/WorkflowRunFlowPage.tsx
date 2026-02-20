import { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { useFlowLayout } from '@/components/flow/hooks/useFlowLayout';
import { useWorkflowRunToFlow } from '@/components/flow/hooks/useWorkflowRunToFlow';
import { RunOverviewPanel } from '@/components/flow/panels/RunOverviewPanel';
import { WorkExecutionDetailPanel } from '@/components/flow/panels/WorkExecutionDetailPanel';
import { RuntimeWorkNodePanel } from '@/components/flow/panels/RuntimeWorkNodePanel';
import { CheckpointPanel } from '@/components/flow/panels/CheckpointPanel';
import { useWorkflowRunDetail } from '@/hooks/useWorkflowRuns';
import { Button } from '@/components/ui/button';
import { IssueKeyDialog } from '@/components/IssueKeyDialog';
import { WorkspaceViewerPanel } from '@/components/flow/panels/WorkspaceViewerPanel';
import { Plus, RotateCcw, Code } from 'lucide-react';
import type { WorkflowRunDetailResponse } from '@/api/types';

type SelectedPanel =
  | { type: 'overview' }
  | { type: 'report'; workExecutionId: string }
  | { type: 'editWork'; sequence: number }
  | { type: 'addWork' }
  | { type: 'checkpoints' }
  | { type: 'workspace' };

function getEditableFromSequence(rd: WorkflowRunDetailResponse): number {
  if (rd.status === 'INITIALIZED') return 0;
  if (rd.status === 'RUNNING') return rd.currentWorkIndex + 1;
  if (rd.restoredToCheckpoint) return rd.currentWorkIndex;
  return rd.currentWorkIndex + 1;
}

export function WorkflowRunFlowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedPanel, setSelectedPanel] = useState<SelectedPanel>({ type: 'overview' });
  const [autoResume, setAutoResume] = useState(false);
  const [showRerunDialog, setShowRerunDialog] = useState(false);

  const {
    detailQuery,
    checkpointsQuery,
    pauseMutation,
    resumeMutation,
    restoreMutation,
    cancelMutation,
    deleteMutation,
    editWorkNodeMutation,
    addWorkNodeMutation,
    deleteWorkNodeMutation,
    startNewRunMutation,
  } = useWorkflowRunDetail(id!);

  const runDetail = detailQuery.data;
  const checkpoints = checkpointsQuery.data;

  const handleTogglePauseAfter = useCallback(
    (sequence: number) => {
      if (!runDetail) return;
      const nodeConfig = runDetail.workNodeConfigs?.find((n) => n.sequence === sequence);
      if (!nodeConfig) return;
      editWorkNodeMutation.mutate({
        sequence,
        config: { pauseAfter: !nodeConfig.pauseAfter },
      });
    },
    [runDetail, editWorkNodeMutation],
  );

  const editableFrom = runDetail ? getEditableFromSequence(runDetail) : undefined;

  const { nodes: rawNodes, edges: rawEdges } = useWorkflowRunToFlow(runDetail, checkpoints, {
    editableFromSequence: editableFrom,
    onTogglePauseAfter: handleTogglePauseAfter,
  });
  const { nodes, edges } = useFlowLayout(rawNodes, rawEdges);

  const isPausedOrAwaiting = runDetail?.status === 'PAUSED' || runDetail?.status === 'AWAITING';

  const resumeMutate = resumeMutation.mutate;
  useEffect(() => {
    if (autoResume && runDetail?.status === 'AWAITING') {
      resumeMutate(undefined);
    }
  }, [autoResume, runDetail?.status, resumeMutate]);

  const onNodeSelect = useCallback(
    (nodeId: string | null) => {
      if (!nodeId || !runDetail) {
        setSelectedPanel({ type: 'overview' });
        return;
      }

      if (nodeId.startsWith('work-')) {
        const seq = parseInt(nodeId.split('-')[1], 10);
        const editableFrom = getEditableFromSequence(runDetail);

        if (runDetail.workExecutionIds?.[seq]) {
          setSelectedPanel({ type: 'report', workExecutionId: runDetail.workExecutionIds[seq] });
        } else if (seq >= editableFrom) {
          setSelectedPanel({ type: 'editWork', sequence: seq });
        } else {
          setSelectedPanel({ type: 'overview' });
        }
      } else if (nodeId.startsWith('task-')) {
        const parts = nodeId.split('-');
        const seq = parseInt(parts[1], 10);
        if (runDetail.workExecutionIds?.[seq]) {
          setSelectedPanel({ type: 'report', workExecutionId: runDetail.workExecutionIds[seq] });
        } else {
          setSelectedPanel({ type: 'overview' });
        }
      } else {
        setSelectedPanel({ type: 'overview' });
      }
    },
    [runDetail],
  );

  if (detailQuery.isLoading) return <LoadingSpinner />;
  if (!runDetail) return <div>실행 기록을 찾을 수 없습니다.</div>;

  const editableFromResolved = getEditableFromSequence(runDetail);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <PageHeader title={`실행 상세: ${runDetail.workflowId}`}>
            <StatusBadge status={runDetail.status} />
          </PageHeader>
          <div className="flex gap-2">
            {isPausedOrAwaiting && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPanel({ type: 'addWork' })}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  작업 추가
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPanel({ type: 'checkpoints' })}
                >
                  체크포인트
                </Button>
              </>
            )}
            {(runDetail.status === 'COMPLETED' || runDetail.status === 'CANCELLED') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPanel({ type: 'workspace' })}
                >
                  <Code className="mr-1 h-4 w-4" />
                  파일 탐색
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRerunDialog(true)}
                  disabled={startNewRunMutation.isPending}
                >
                  <RotateCcw className="mr-1 h-4 w-4" />
                  재실행
                </Button>
              </>
            )}
            <Link to="/" className="text-sm text-muted-foreground hover:underline self-center">
              대시보드
            </Link>
          </div>
        </div>

        {selectedPanel.type === 'workspace' ? (
          <div className="flex-1 overflow-hidden">
            <WorkspaceViewerPanel
              runId={id!}
              onClose={() => setSelectedPanel({ type: 'overview' })}
            />
          </div>
        ) : (
        <div className="flex-1 flex overflow-hidden">
          <FlowCanvas
            mode="view"
            nodes={nodes}
            edges={edges}
            onNodeSelect={onNodeSelect}
            className="flex-1 h-full"
          />

          <div className="w-[380px] border-l overflow-y-auto bg-white flow-side-panel">
            {selectedPanel.type === 'overview' && (
              <RunOverviewPanel
                runDetail={runDetail}
                onPause={() => pauseMutation.mutate()}
                onResume={(checkpointId) => resumeMutation.mutate(checkpointId)}
                onCancel={(reason) => cancelMutation.mutate(reason)}
                onDelete={() =>
                  deleteMutation.mutate(undefined, {
                    onSuccess: () => navigate('/'),
                  })
                }
                onRerun={() => setShowRerunDialog(true)}
                isPausePending={pauseMutation.isPending}
                isResumePending={resumeMutation.isPending}
                isCancelPending={cancelMutation.isPending}
                isDeletePending={deleteMutation.isPending}
                isRerunPending={startNewRunMutation.isPending}
                checkpoints={checkpoints}
                onRestore={(checkpointId) =>
                  restoreMutation.mutate(checkpointId, {
                    onSuccess: () => setSelectedPanel({ type: 'overview' }),
                  })
                }
                isRestorePending={restoreMutation.isPending}
                autoResume={autoResume}
                onAutoResumeChange={setAutoResume}
              />
            )}
            {selectedPanel.type === 'report' && (
              <WorkExecutionDetailPanel
                runId={id!}
                workExecutionId={selectedPanel.workExecutionId}
                isRunning={runDetail.status === 'RUNNING'}
              />
            )}
            {selectedPanel.type === 'editWork' && (
              <RuntimeWorkNodePanel
                nodeConfig={runDetail.workNodeConfigs?.find(
                  (n) => n.sequence === selectedPanel.sequence,
                )}
                sequence={selectedPanel.sequence}
                isEditable={selectedPanel.sequence >= editableFromResolved}
                onEdit={(config) =>
                  editWorkNodeMutation.mutate(
                    { sequence: selectedPanel.sequence, config },
                    { onSuccess: () => setSelectedPanel({ type: 'overview' }) },
                  )
                }
                onDelete={() =>
                  deleteWorkNodeMutation.mutate(selectedPanel.sequence, {
                    onSuccess: () => setSelectedPanel({ type: 'overview' }),
                  })
                }
                onAdd={(config) =>
                  addWorkNodeMutation.mutate(config, {
                    onSuccess: () => setSelectedPanel({ type: 'overview' }),
                  })
                }
                isEditPending={editWorkNodeMutation.isPending}
                isDeletePending={deleteWorkNodeMutation.isPending}
                isAddPending={addWorkNodeMutation.isPending}
                mode="edit"
                gitRefPool={runDetail.gitRefPool}
                mcpServerRefPool={runDetail.mcpServerRefPool}
                allWorkNodeConfigs={runDetail.workNodeConfigs}
              />
            )}
            {selectedPanel.type === 'addWork' && (
              <RuntimeWorkNodePanel
                sequence={runDetail.totalWorkCount}
                isEditable
                onEdit={() => {}}
                onDelete={() => {}}
                onAdd={(config) =>
                  addWorkNodeMutation.mutate(config, {
                    onSuccess: () => setSelectedPanel({ type: 'overview' }),
                  })
                }
                isEditPending={false}
                isDeletePending={false}
                isAddPending={addWorkNodeMutation.isPending}
                mode="add"
                gitRefPool={runDetail.gitRefPool}
                mcpServerRefPool={runDetail.mcpServerRefPool}
                allWorkNodeConfigs={runDetail.workNodeConfigs}
              />
            )}
            {selectedPanel.type === 'checkpoints' && checkpoints && (
              <CheckpointPanel
                checkpoints={checkpoints}
                onRestore={(checkpointId) =>
                  restoreMutation.mutate(checkpointId, {
                    onSuccess: () => setSelectedPanel({ type: 'overview' }),
                  })
                }
                isRestorePending={restoreMutation.isPending}
              />
            )}
          </div>
        </div>
        )}
      </div>

      <IssueKeyDialog
        open={showRerunDialog}
        onOpenChange={setShowRerunDialog}
        defaultIssueKey={runDetail.issueKey}
        seedKeys={runDetail.seedKeys}
        defaultSeedValues={runDetail.seedValues}
        loading={startNewRunMutation.isPending}
        onConfirm={(issueKey, seedValues) => {
          startNewRunMutation.mutate(
            { workflowId: runDetail.workflowId, issueKey, seedValues },
            {
              onSuccess: (data) => {
                setShowRerunDialog(false);
                navigate(`/workflow-runs/${data.workflowRunId}`);
              },
            },
          );
        }}
      />
    </ReactFlowProvider>
  );
}
