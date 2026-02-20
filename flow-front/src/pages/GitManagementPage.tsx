import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGits } from '@/hooks/useGits';
import { useWorkflows } from '@/hooks/useWorkflows';
import type { GitResponse, ApiError } from '@/api/types';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';

const gitFormSchema = z.object({
  url: z
    .string()
    .min(1, 'URL은 필수입니다')
    .refine(
      (v) => /^(https?:\/\/.+|git:\/\/.+|ssh:\/\/.+|git@.+:.+)$/.test(v),
      'Git URL 형식이 올바르지 않습니다 (https, git, ssh, git@ 형식 지원)',
    ),
  localPath: z
    .string()
    .min(1, 'Local path는 필수입니다')
    .refine((v) => !v.startsWith('/'), '상대 경로를 입력하세요 (서버 기본 경로 기준)'),
});

type GitFormValues = z.infer<typeof gitFormSchema>;

export function GitManagementPage() {
  const { listQuery, createMutation, deleteMutation } = useGits();
  const { listQuery: workflowsQuery } = useWorkflows();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GitResponse | null>(null);

  const form = useForm<GitFormValues>({
    resolver: zodResolver(gitFormSchema),
    defaultValues: { url: '', localPath: '' },
  });

  const getRefCount = (gitId: string) => {
    return (
      workflowsQuery.data?.filter((w) =>
        w.gitRefs.some((ref) => ref.gitId === gitId),
      ).length ?? 0
    );
  };

  const getReferencingWorkflows = (gitId: string) => {
    return (
      workflowsQuery.data?.filter((w) =>
        w.gitRefs.some((ref) => ref.gitId === gitId),
      ) ?? []
    );
  };

  const onRegister = (values: GitFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setIsRegisterOpen(false);
        form.reset();
        createMutation.reset();
      },
    });
  };

  const onDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const columns: Column<GitResponse>[] = [
    { header: 'URL', accessor: 'url' },
    { header: 'Local Path', accessor: 'localPath' },
    {
      header: '참조',
      accessor: (row) => getRefCount(row.id),
      className: 'w-20 text-center',
    },
    {
      header: '',
      accessor: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDeleteTarget(row)}>
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  if (listQuery.isLoading) return <LoadingSpinner />;

  const refCount = deleteTarget ? getRefCount(deleteTarget.id) : 0;
  const referencingWorkflows = deleteTarget
    ? getReferencingWorkflows(deleteTarget.id)
    : [];

  return (
    <div>
      <PageHeader title="Git 저장소 관리">
        <Button onClick={() => setIsRegisterOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          저장소 등록
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={listQuery.data ?? []}
        emptyMessage="등록된 Git 저장소가 없습니다."
        emptyAction={{ label: '저장소 등록', onClick: () => setIsRegisterOpen(true) }}
      />

      {/* Register Dialog */}
      <Dialog
        open={isRegisterOpen}
        onOpenChange={(open) => {
          setIsRegisterOpen(open);
          if (!open) {
            form.reset();
            createMutation.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Git 저장소 등록</DialogTitle>
            <DialogDescription>새 Git 저장소를 등록합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onRegister)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">URL *</label>
              <Input {...form.register('url')} placeholder="git@github.com:org/repo.git" />
              {form.formState.errors.url && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.url.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Local Path *</label>
              <Input
                {...form.register('localPath')}
                placeholder="my-org/my-repo"
              />
              {form.formState.errors.localPath && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.localPath.message}
                </p>
              )}
            </div>
            {createMutation.error && (
              <ErrorAlert error={createMutation.error as unknown as ApiError} />
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRegisterOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? '등록 중...' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {refCount > 0 ? '삭제 불가' : '저장소 삭제'}
            </DialogTitle>
            <DialogDescription>
              {refCount > 0
                ? '이 저장소를 참조하는 워크플로우가 있어 삭제할 수 없습니다.'
                : '이 저장소를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'}
            </DialogDescription>
          </DialogHeader>
          {refCount > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">참조 중인 워크플로우:</p>
              <ul className="text-sm text-muted-foreground list-disc pl-4">
                {referencingWorkflows.map((w) => (
                  <li key={w.id}>{w.name}</li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                먼저 해당 워크플로우에서 이 Git 참조를 제거하세요.
              </p>
            </div>
          )}
          <DialogFooter>
            {refCount > 0 ? (
              <Button onClick={() => setDeleteTarget(null)}>확인</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
