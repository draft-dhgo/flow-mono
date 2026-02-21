import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWorkflowRunList } from '@/hooks/useWorkflowRuns';
import { SUMMARY_CARD_COLOR } from '@/lib/constants';
import type { WorkflowRunListItem } from '@/api/types';
import {
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  Square,
  Trash2,
} from 'lucide-react';

const summaryCards = [
  { key: 'running' as const, label: '실행 중', icon: Play },
  { key: 'paused' as const, label: '일시정지', icon: Pause },
  { key: 'awaiting' as const, label: '대기 중', icon: Clock },
  { key: 'completed' as const, label: '완료', icon: CheckCircle },
  { key: 'cancelled' as const, label: '취소', icon: XCircle },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    listQuery,
    summaryQuery,
    pauseMutation,
    resumeMutation,
    cancelMutation,
    deleteMutation,
  } = useWorkflowRunList();

  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const summary = summaryQuery.data;

  const handlePause = (id: string) => pauseMutation.mutate(id);
  const handleResume = (id: string) => resumeMutation.mutate({ id });
  const handleCancel = () => {
    if (!cancelTarget) return;
    cancelMutation.mutate(
      { id: cancelTarget, reason: cancelReason || undefined },
      {
        onSuccess: () => {
          setCancelTarget(null);
          setCancelReason('');
        },
      },
    );
  };
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const columns: Column<WorkflowRunListItem>[] = [
    { header: 'Workflow', accessor: 'workflowName' },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Progress',
      accessor: (row) => (
        <span className="text-sm">
          Work {Math.min(row.currentWorkIndex + 1, row.totalWorkCount)}/{row.totalWorkCount}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === 'RUNNING' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePause(row.id)}
              >
                <Pause className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCancelTarget(row.id)}
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
          {(row.status === 'PAUSED' || row.status === 'AWAITING') && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleResume(row.id)}
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCancelTarget(row.id)}
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
          {(row.status === 'COMPLETED' || row.status === 'CANCELLED') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDeleteTarget(row.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      className: 'w-28',
    },
  ];

  const isLoading = listQuery.isLoading && !listQuery.data;

  return (
    <div>
      <PageHeader title="Dashboard" />

      {/* Summary Cards */}
      {summaryQuery.isLoading ? (
        <CardSkeleton count={5} />
      ) : (
        <div className="grid grid-cols-5 gap-4 mb-6">
          {summaryCards.map(({ key, label, icon: Icon }) => (
            <Card key={key}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${SUMMARY_CARD_COLOR[key]}`} />
                <div>
                  <p className="text-2xl font-bold">{summary?.[key] ?? 0}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Runs */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">최근 실행 목록</h2>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : (
        <DataTable
          columns={columns}
          data={listQuery.data ?? []}
          onRowClick={(row) => navigate(`/workflow-runs/${row.id}`)}
          emptyMessage="실행 기록이 없습니다."
        />
      )}

      {/* Cancel Dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason('');
          }
        }}
        title="실행 취소"
        description="정말 취소하시겠습니까?"
        confirmLabel="취소 실행"
        destructive
        onConfirm={handleCancel}
        loading={cancelMutation.isPending}
      >
        <div className="py-2">
          <label className="text-sm font-medium">취소 사유 (선택)</label>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="취소 사유를 입력하세요"
          />
        </div>
      </ConfirmDialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="실행 기록 삭제"
        description="이 실행 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
