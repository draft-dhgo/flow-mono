import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWorkflowRunList } from '@/hooks/useWorkflowRuns';
import type { WorkflowRunListItem, WorkflowRunStatus } from '@/api/types';
import { RUN_STATUS_LABEL } from '@/lib/constants';
import {
  Play,
  Pause,
  Square,
  Trash2,
} from 'lucide-react';

type FilterStatus = WorkflowRunStatus | 'ALL';

const filterButtons: { key: FilterStatus; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'RUNNING', label: '실행 중' },
  { key: 'PAUSED', label: '일시정지' },
  { key: 'AWAITING', label: '대기 중' },
  { key: 'COMPLETED', label: '완료' },
  { key: 'CANCELLED', label: '취소' },
];

export function WorkflowRunListPage() {
  const navigate = useNavigate();
  const {
    listQuery,
    pauseMutation,
    resumeMutation,
    cancelMutation,
    deleteMutation,
  } = useWorkflowRunList();

  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  const filteredData = (listQuery.data ?? []).filter(
    (item) => filter === 'ALL' || item.status === filter,
  );

  const columns: Column<WorkflowRunListItem>[] = [
    { header: 'Workflow', accessor: 'workflowName' },
    { header: 'Issue Key', accessor: 'issueKey' },
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
      <PageHeader title="워크플로우 실행 목록" />

      <div className="flex gap-2 mb-4">
        {filterButtons.map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
            {key !== 'ALL' && ` (${(listQuery.data ?? []).filter((r) => r.status === key).length})`}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          onRowClick={(row) => navigate(`/workflow-runs/${row.id}`)}
          emptyMessage={
            filter === 'ALL'
              ? '실행 기록이 없습니다.'
              : `${RUN_STATUS_LABEL[filter]} 상태의 실행 기록이 없습니다.`
          }
        />
      )}

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
