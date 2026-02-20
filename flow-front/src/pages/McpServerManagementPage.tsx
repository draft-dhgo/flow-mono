import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { useMcpServers } from '@/hooks/useMcpServers';
import { useWorkflows } from '@/hooks/useWorkflows';
import type { McpServerResponse, McpTransportType, ApiError } from '@/api/types';
import { Plus, MoreHorizontal, Trash2, X } from 'lucide-react';

const mcpServerFormSchema = z
  .object({
    name: z.string().min(1, '이름은 필수입니다'),
    command: z.string().min(1, 'Command는 필수입니다'),
    args: z.array(z.object({ value: z.string() })).optional(),
    env: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    transportType: z.enum(['STDIO', 'SSE', 'STREAMABLE_HTTP']),
    url: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.transportType === 'SSE' || data.transportType === 'STREAMABLE_HTTP') {
        return !!data.url && data.url.length > 0;
      }
      return true;
    },
    { message: 'SSE/STREAMABLE_HTTP 타입은 URL이 필수입니다', path: ['url'] },
  );

type McpFormValues = z.infer<typeof mcpServerFormSchema>;

export function McpServerManagementPage() {
  const { listQuery, registerMutation, unregisterMutation } = useMcpServers();
  const { listQuery: workflowsQuery } = useWorkflows();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<McpServerResponse | null>(null);

  const form = useForm<McpFormValues>({
    resolver: zodResolver(mcpServerFormSchema),
    defaultValues: {
      name: '',
      command: '',
      args: [],
      env: [],
      transportType: 'STDIO',
      url: '',
    },
  });

  const argsFieldArray = useFieldArray({ control: form.control, name: 'args' });
  const envFieldArray = useFieldArray({ control: form.control, name: 'env' });
  const transportType = form.watch('transportType');

  const onRegister = (values: McpFormValues) => {
    const data = {
      name: values.name,
      command: values.command,
      args: values.args?.map((a) => a.value).filter(Boolean) ?? [],
      env: values.env?.reduce(
        (acc, e) => {
          if (e.key) acc[e.key] = e.value;
          return acc;
        },
        {} as Record<string, string>,
      ),
      transportType: values.transportType as McpTransportType,
      url: values.transportType !== 'STDIO' ? values.url : undefined,
    };
    registerMutation.mutate(data, {
      onSuccess: () => {
        setIsRegisterOpen(false);
        form.reset();
        registerMutation.reset();
      },
    });
  };

  const onUnregister = () => {
    if (!deleteTarget) return;
    unregisterMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const getRefCount = (serverId: string) => {
    return (
      workflowsQuery.data?.filter((w) =>
        w.mcpServerRefs.some((ref) => ref.mcpServerId === serverId),
      ).length ?? 0
    );
  };

  const getReferencingWorkflows = (serverId: string) => {
    return (
      workflowsQuery.data?.filter((w) =>
        w.mcpServerRefs.some((ref) => ref.mcpServerId === serverId),
      ) ?? []
    );
  };

  const transportColor: Record<string, string> = {
    STDIO: 'bg-gray-100 text-gray-800',
    SSE: 'bg-blue-100 text-blue-800',
    STREAMABLE_HTTP: 'bg-purple-100 text-purple-800',
  };

  const columns: Column<McpServerResponse>[] = [
    { header: 'Name', accessor: 'name' },
    {
      header: 'Transport',
      accessor: (row) => (
        <Badge variant="secondary" className={transportColor[row.transportType]}>
          {row.transportType}
        </Badge>
      ),
    },
    {
      header: 'Command / URL',
      accessor: (row) =>
        row.transportType === 'STDIO'
          ? `${row.command} ${row.args.join(' ')}`.trim()
          : row.url ?? '-',
    },
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
              해제
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
      <PageHeader title="MCP 서버 관리">
        <Button onClick={() => setIsRegisterOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          서버 등록
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={listQuery.data ?? []}
        emptyMessage="등록된 MCP 서버가 없습니다."
        emptyAction={{ label: '서버 등록', onClick: () => setIsRegisterOpen(true) }}
      />

      {/* Register Dialog */}
      <Dialog
        open={isRegisterOpen}
        onOpenChange={(open) => {
          setIsRegisterOpen(open);
          if (!open) {
            form.reset();
            registerMutation.reset();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>MCP 서버 등록</DialogTitle>
            <DialogDescription>새 MCP 서버를 등록합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onRegister)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">이름 *</label>
              <Input {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Command *</label>
              <Input {...form.register('command')} />
              {form.formState.errors.command && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.command.message}
                </p>
              )}
            </div>

            {/* Arguments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Arguments</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => argsFieldArray.append({ value: '' })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  인자 추가
                </Button>
              </div>
              {argsFieldArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input {...form.register(`args.${index}.value`)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => argsFieldArray.remove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Env */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Environment Variables</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => envFieldArray.append({ key: '', value: '' })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  환경변수 추가
                </Button>
              </div>
              {envFieldArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`env.${index}.key`)}
                    placeholder="Key"
                    className="w-1/3"
                  />
                  <Input
                    {...form.register(`env.${index}.value`)}
                    placeholder="Value"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => envFieldArray.remove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Transport Type */}
            <div>
              <label className="text-sm font-medium">Transport Type *</label>
              <RadioGroup
                value={transportType}
                onValueChange={(v) =>
                  form.setValue('transportType', v as McpTransportType)
                }
                className="flex gap-4 mt-2"
              >
                {(['STDIO', 'SSE', 'STREAMABLE_HTTP'] as const).map((t) => (
                  <div key={t} className="flex items-center space-x-2">
                    <RadioGroupItem value={t} id={t} />
                    <label htmlFor={t} className="text-sm">
                      {t}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* URL */}
            <div>
              <label className="text-sm font-medium">
                URL {transportType !== 'STDIO' ? '*' : ''}
              </label>
              <Input
                {...form.register('url')}
                disabled={transportType === 'STDIO'}
                placeholder={
                  transportType === 'STDIO'
                    ? 'STDIO 모드에서는 불필요'
                    : 'https://...'
                }
              />
              {form.formState.errors.url && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.url.message}
                </p>
              )}
            </div>

            {registerMutation.error && (
              <ErrorAlert error={registerMutation.error as unknown as ApiError} />
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRegisterOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? '등록 중...' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {refCount > 0 ? '해제 불가' : '서버 해제'}
            </DialogTitle>
            <DialogDescription>
              {refCount > 0
                ? '이 서버를 참조하는 워크플로우가 있어 해제할 수 없습니다.'
                : `"${deleteTarget?.name}" 서버를 해제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
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
            </div>
          )}
          <DialogFooter>
            {refCount > 0 ? (
              <>
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                  닫기
                </Button>
                <Button disabled>해제</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={onUnregister}
                  disabled={unregisterMutation.isPending}
                >
                  {unregisterMutation.isPending ? '해제 중...' : '해제'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
