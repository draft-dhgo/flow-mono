import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { IssueKeyDialog } from '@/components/IssueKeyDialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkflows } from '@/hooks/useWorkflows';
import type { WorkflowListItem } from '@/api/types';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Zap,
  ZapOff,
  Play,
  Trash2,
} from 'lucide-react';

export function WorkflowListPage() {
  const navigate = useNavigate();
  const {
    listQuery,
    activateMutation,
    deactivateMutation,
    deleteMutation,
    startRunMutation,
    bulkDeleteMutation,
  } = useWorkflows();
  const [deleteTarget, setDeleteTarget] = useState<WorkflowListItem | null>(null);
  const [runTarget, setRunTarget] = useState<WorkflowListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const data = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const draftIds = useMemo(
    () => new Set(data.filter((w) => w.status === 'DRAFT').map((w) => w.id)),
    [data],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === draftIds.size && draftIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(draftIds));
    }
  };

  const handleActivate = (id: string) => activateMutation.mutate(id);
  const handleDeactivate = (id: string) => deactivateMutation.mutate(id);
  const handleRun = (row: WorkflowListItem) => {
    setRunTarget(row);
  };
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate([...selectedIds], {
      onSuccess: () => {
        setSelectedIds(new Set());
        setBulkDeleteOpen(false);
      },
    });
  };

  const allChecked = draftIds.size > 0 && selectedIds.size === draftIds.size;
  const someChecked = selectedIds.size > 0 && selectedIds.size < draftIds.size;

  const columns: Column<WorkflowListItem>[] = [
    {
      header: '',
      accessor: (row) =>
        row.status === 'DRAFT' ? (
          <Checkbox
            checked={selectedIds.has(row.id)}
            onCheckedChange={() => toggleSelect(row.id)}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        ) : null,
      className: 'w-10',
    },
    { header: 'Name', accessor: 'name' },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} type="workflow" />,
    },
    { header: 'Git', accessor: 'gitRefCount', className: 'text-center w-16' },
    { header: 'MCP', accessor: 'mcpServerRefCount', className: 'text-center w-16' },
    {
      header: 'Works',
      accessor: 'workDefinitionCount',
      className: 'text-center w-16',
    },
    {
      header: '',
      accessor: (row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === 'DRAFT' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(row)}
              title="삭제"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {row.status === 'DRAFT' && (
                <>
                  <DropdownMenuItem
                    onClick={() => navigate(`/workflows/${row.id}/edit`)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleActivate(row.id)}>
                    <Zap className="mr-2 h-4 w-4" />
                    활성화
                  </DropdownMenuItem>
                </>
              )}
              {row.status === 'ACTIVE' && (
                <>
                  <DropdownMenuItem onClick={() => handleRun(row)}>
                    <Play className="mr-2 h-4 w-4" />
                    실행
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeactivate(row.id)}>
                    <ZapOff className="mr-2 h-4 w-4" />
                    비활성화
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      className: 'w-24',
    },
  ];

  return (
    <div>
      <PageHeader title="워크플로우 관리">
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              {selectedIds.size}개 삭제
            </Button>
          )}
          <Button onClick={() => navigate('/workflows/new')}>
            <Plus className="mr-2 h-4 w-4" />새 워크플로우
          </Button>
        </div>
      </PageHeader>

      {data.length > 0 && draftIds.size > 0 && (
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={allChecked}
            {...(someChecked ? { 'data-state': 'indeterminate' } : {})}
            onCheckedChange={toggleAll}
          />
          <span>
            전체 선택 ({selectedIds.size}/{draftIds.size})
          </span>
        </div>
      )}

      {listQuery.isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          onRowClick={(row) =>
            navigate(
              row.status === 'DRAFT'
                ? `/workflows/${row.id}/edit`
                : `/workflows/${row.id}`,
            )
          }
          emptyMessage="워크플로우가 없습니다."
          emptyAction={{
            label: '새 워크플로우',
            onClick: () => navigate('/workflows/new'),
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="워크플로우 삭제"
        description={`워크플로우 "${deleteTarget?.name}"를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
        title="워크플로우 일괄 삭제"
        description={`선택한 ${selectedIds.size}개의 워크플로우를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        destructive
        onConfirm={handleBulkDelete}
        loading={bulkDeleteMutation.isPending}
      />

      <IssueKeyDialog
        open={!!runTarget}
        onOpenChange={(open) => !open && setRunTarget(null)}
        branchStrategy={runTarget?.branchStrategy}
        seedKeys={runTarget?.seedKeys}
        loading={startRunMutation.isPending}
        onConfirm={(issueKey, seedValues) => {
          if (!runTarget) return;
          startRunMutation.mutate(
            { workflowId: runTarget.id, issueKey, seedValues },
            {
              onSuccess: (data) => {
                setRunTarget(null);
                navigate(`/workflow-runs/${data.workflowRunId}`);
              },
            },
          );
        }}
      />
    </div>
  );
}
