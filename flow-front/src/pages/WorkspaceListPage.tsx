import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useWorkspaceList } from '@/hooks/useWorkspaces';
import type { WorkspaceListItem, WorkspaceStatus } from '@/api/types';
import { WORKSPACE_STATUS_LABEL } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { Plus, Trash2 } from 'lucide-react';

type FilterStatus = WorkspaceStatus | 'ALL';

const filterButtons: { key: FilterStatus; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'ACTIVE', label: '활성' },
  { key: 'COMPLETED', label: '완료' },
];

export function WorkspaceListPage() {
  const navigate = useNavigate();
  const { listQuery, deleteMutation } = useWorkspaceList();

  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const filteredData = (listQuery.data ?? []).filter(
    (item) => filter === 'ALL' || item.status === filter,
  );

  const columns: Column<WorkspaceListItem>[] = [
    { header: '이름', accessor: 'name' },
    {
      header: '상태',
      accessor: (row) => <StatusBadge status={row.status} type="workspace" />,
    },
    { header: '모델', accessor: 'model' },
    {
      header: 'Git 프로젝트',
      accessor: (row) => <span>{row.gitRefCount}개</span>,
    },
    {
      header: '생성일',
      accessor: (row) => <span className="text-sm">{formatDate(row.createdAt)}</span>,
    },
    {
      header: '액션',
      accessor: (row) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDeleteTarget(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: 'w-20',
    },
  ];

  const isLoading = listQuery.isLoading && !listQuery.data;

  return (
    <div>
      <PageHeader title="워크스페이스">
        <Button onClick={() => navigate('/workspaces/new')}>
          <Plus className="h-4 w-4 mr-1" />새 워크스페이스
        </Button>
      </PageHeader>

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
        <TableSkeleton rows={5} columns={6} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          onRowClick={(row) => navigate(`/workspaces/${row.id}`)}
          emptyMessage={
            filter === 'ALL'
              ? '워크스페이스가 없습니다.'
              : `${WORKSPACE_STATUS_LABEL[filter]} 상태의 워크스페이스가 없습니다.`
          }
          emptyAction={
            filter === 'ALL'
              ? { label: '새 워크스페이스', onClick: () => navigate('/workspaces/new') }
              : undefined
          }
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="워크스페이스 삭제"
        description="이 워크스페이스를 삭제하시겠습니까? 관련 브랜치와 워크트리가 모두 제거됩니다."
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
