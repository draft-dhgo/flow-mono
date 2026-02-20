import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm, useFieldArray, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ReactFlowProvider } from '@xyflow/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { useFlowLayout } from '@/components/flow/hooks/useFlowLayout';
import { useWorkflowToFlow } from '@/components/flow/hooks/useWorkflowToFlow';
import { WorkflowInfoPanel } from '@/components/flow/panels/WorkflowInfoPanel';
import { WorkNodePanel } from '@/components/flow/panels/WorkNodePanel';
import { TaskNodePanel } from '@/components/flow/panels/TaskNodePanel';
import { useWorkflows, useWorkflowDetail } from '@/hooks/useWorkflows';
import { useGits } from '@/hooks/useGits';
import { useMcpServers } from '@/hooks/useMcpServers';
import type { ApiError } from '@/api/types';

function collectErrorMessages(errors: FieldErrors, prefix = ''): string[] {
  const msgs: string[] = [];
  for (const [key, val] of Object.entries(errors)) {
    if (!val) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (val.message && typeof val.message === 'string') {
      msgs.push(val.message);
    } else if (val.root?.message && typeof val.root.message === 'string') {
      msgs.push(val.root.message);
    } else if (typeof val === 'object') {
      msgs.push(...collectErrorMessages(val as FieldErrors, path));
    }
  }
  return msgs;
}

const workflowFormSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  description: z.string().optional(),
  branchStrategy: z.string().min(1, '브랜치명은 필수입니다'),
  gitRefs: z
    .array(
      z.object({
        gitId: z.string().min(1, 'Git 저장소를 선택하세요'),
        baseBranch: z.string().min(1, 'Base branch는 필수입니다'),
      }),
    )
    .optional(),
  mcpServerRefs: z
    .array(
      z.object({
        mcpServerId: z.string().min(1, 'MCP 서버를 선택하세요'),
        envOverrides: z.record(z.string(), z.string()).optional(),
      }),
    )
    .optional(),
  seedKeys: z.array(z.string()).optional(),
  workDefinitions: z
    .array(
      z.object({
        order: z.number().min(0),
        model: z.string().min(1, '모델을 선택하세요'),
        pauseAfter: z.boolean().optional(),
        reportFileRefs: z.array(z.number()).optional(),
        gitRefs: z
          .array(z.object({ gitId: z.string().min(1), baseBranch: z.string().min(1) }))
          .optional(),
        mcpServerRefs: z
          .array(z.object({ mcpServerId: z.string().min(1), envOverrides: z.record(z.string(), z.string()).optional() }))
          .optional(),
        taskDefinitions: z
          .array(
            z.object({
              order: z.number().min(0),
              query: z.string().min(1, '쿼리는 필수입니다'),
              reportOutline: z
                .object({
                  sections: z
                    .array(z.object({ title: z.string().min(1), description: z.string().min(1) }))
                    .min(1),
                })
                .optional(),
            }),
          )
          .min(1, '최소 1개의 Task가 필요합니다'),
      }),
    )
    .min(1, '최소 1개의 Work Definition이 필요합니다'),
});

type WorkflowFormValues = z.infer<typeof workflowFormSchema>;

type SelectedPanel =
  | { type: 'info' }
  | { type: 'work'; workIndex: number }
  | { type: 'task'; workIndex: number; taskIndex: number };

export function WorkflowFlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id && location.pathname.endsWith('/edit');
  const isView = !!id && !location.pathname.endsWith('/edit');

  const { createMutation, updateMutation } = useWorkflows();
  const workflowQuery = useWorkflowDetail(id);
  const workflow = workflowQuery.data;
  const isWorkflowLoading = workflowQuery.isLoading;
  const { listQuery: gitsQuery } = useGits();
  const { listQuery: mcpQuery } = useMcpServers();

  const [selectedPanel, setSelectedPanel] = useState<SelectedPanel>({ type: 'info' });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      name: '',
      description: '',
      branchStrategy: '',
      gitRefs: [],
      mcpServerRefs: [],
      seedKeys: [],
      workDefinitions: [
        {
          order: 0,
          model: '',
          pauseAfter: false,
          reportFileRefs: [],
          gitRefs: [],
          mcpServerRefs: [],
          taskDefinitions: [{ order: 0, query: '' }],
        },
      ],
    },
  });

  const workDefsArray = useFieldArray({
    control: form.control,
    name: 'workDefinitions',
  });

  useEffect(() => {
    if (workflow && (isEdit || isView)) {
      form.reset({
        name: workflow.name,
        description: workflow.description,
        branchStrategy: workflow.branchStrategy,
        gitRefs: workflow.gitRefs.map((g) => ({ gitId: g.gitId, baseBranch: g.baseBranch })),
        mcpServerRefs: workflow.mcpServerRefs.map((m) => ({
          mcpServerId: m.mcpServerId,
          envOverrides: m.envOverrides,
        })),
        seedKeys: workflow.seedKeys ?? [],
        workDefinitions: workflow.workDefinitions.map((w) => ({
          order: w.order,
          model: w.model,
          pauseAfter: w.pauseAfter,
          reportFileRefs: w.reportFileRefs ?? [],
          gitRefs: w.gitRefs.map((g) => ({ gitId: g.gitId, baseBranch: g.baseBranch })),
          mcpServerRefs: w.mcpServerRefs.map((m) => ({
            mcpServerId: m.mcpServerId,
            envOverrides: m.envOverrides,
          })),
          taskDefinitions: w.taskDefinitions.map((t) => ({
            order: t.order,
            query: t.query,
            reportOutline: t.reportOutline ?? undefined,
          })),
        })),
      });
    }
  }, [workflow, isEdit, isView, form]);

  const handleTogglePauseAfter = useCallback(
    (workIndex: number) => {
      const current = form.getValues(`workDefinitions.${workIndex}.pauseAfter`);
      form.setValue(`workDefinitions.${workIndex}.pauseAfter`, !current);
    },
    [form],
  );

  const handleRemovePause = useCallback(
    (afterWorkIndex: number) => {
      form.setValue(`workDefinitions.${afterWorkIndex}.pauseAfter`, false);
    },
    [form],
  );

  const handleDeleteWork = useCallback(
    (workIndex: number) => {
      workDefsArray.remove(workIndex);
      setSelectedPanel({ type: 'info' });
    },
    [workDefsArray],
  );

  const handleDeleteTask = useCallback(
    (workIndex: number, taskIndex: number) => {
      const tasks = form.getValues(`workDefinitions.${workIndex}.taskDefinitions`);
      if (tasks.length > 1) {
        form.setValue(
          `workDefinitions.${workIndex}.taskDefinitions`,
          tasks.filter((_: unknown, i: number) => i !== taskIndex),
        );
        setSelectedPanel({ type: 'work', workIndex });
      }
    },
    [form],
  );

  const watchedValues = form.watch();
  const flowMode = isView ? 'view' : 'edit';
  const { nodes: rawNodes, edges: rawEdges } = useWorkflowToFlow(
    watchedValues,
    flowMode,
    flowMode === 'edit'
      ? {
          onTogglePauseAfter: handleTogglePauseAfter,
          onRemovePause: handleRemovePause,
          onDeleteWork: handleDeleteWork,
          onDeleteTask: handleDeleteTask,
        }
      : undefined,
  );
  const { nodes, edges } = useFlowLayout(rawNodes, rawEdges);

  const onNodeSelect = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) {
        setSelectedPanel({ type: 'info' });
        return;
      }
      if (nodeId.startsWith('work-')) {
        const workIndex = parseInt(nodeId.split('-')[1], 10);
        setSelectedPanel({ type: 'work', workIndex });
      } else if (nodeId.startsWith('task-')) {
        const parts = nodeId.split('-');
        const workIndex = parseInt(parts[1], 10);
        const taskIndex = parseInt(parts[2], 10);
        setSelectedPanel({ type: 'task', workIndex, taskIndex });
      } else if (nodeId.startsWith('add-')) {
        // Handle add button click
        const parts = nodeId.split('-');
        const insertAt = parseInt(parts[parts.length - 1], 10);
        handleAddWork(insertAt);
      } else {
        setSelectedPanel({ type: 'info' });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleAddWork = useCallback(
    (insertAt: number) => {
      workDefsArray.insert(insertAt, {
        order: insertAt,
        model: '',
        pauseAfter: false,
        reportFileRefs: [],
        gitRefs: [],
        mcpServerRefs: [],
        taskDefinitions: [{ order: 0, query: '' }],
      });
      setSelectedPanel({ type: 'work', workIndex: insertAt });
    },
    [workDefsArray],
  );

  // Keyboard shortcuts: Ctrl+S save, Escape deselect, Delete remove selected work
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
      if (e.key === 'Escape') {
        setSelectedPanel({ type: 'info' });
      }
      if (e.key === 'Delete' && selectedPanel.type === 'work') {
        workDefsArray.remove(selectedPanel.workIndex);
        setSelectedPanel({ type: 'info' });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPanel, workDefsArray]);

  const onInvalid = (errors: FieldErrors<WorkflowFormValues>) => {
    const msgs = [...new Set(collectErrorMessages(errors))];
    setValidationErrors(msgs);
  };

  const onSubmit = (values: WorkflowFormValues) => {
    setValidationErrors([]);
    // Recompute order fields
    const normalized = {
      ...values,
      workDefinitions: values.workDefinitions.map((w, wi) => ({
        ...w,
        order: wi,
        taskDefinitions: w.taskDefinitions.map((t, ti) => ({
          ...t,
          order: ti,
        })),
      })),
    };

    if (isEdit) {
      updateMutation.mutate(
        {
          id: id!,
          data: {
            name: normalized.name,
            description: normalized.description,
            gitRefs: normalized.gitRefs,
            mcpServerRefs: normalized.mcpServerRefs,
            workDefinitions: normalized.workDefinitions,
            seedKeys: normalized.seedKeys,
          },
        },
        { onSuccess: () => navigate('/workflows') },
      );
    } else {
      createMutation.mutate(normalized, {
        onSuccess: () => navigate('/workflows'),
      });
    }
  };

  const mutationError = isEdit ? updateMutation.error : createMutation.error;
  const isPending = isEdit ? updateMutation.isPending : createMutation.isPending;

  if ((isEdit || isView) && isWorkflowLoading) return <LoadingSpinner />;

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <PageHeader title={isView ? '워크플로우 상세' : isEdit ? '워크플로우 수정' : '워크플로우 생성'} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/workflows')}>
              {isView ? '목록' : '취소'}
            </Button>
            {isView && workflow?.status === 'DRAFT' && (
              <Button variant="outline" onClick={() => navigate(`/workflows/${id}/edit`)}>
                수정
              </Button>
            )}
            {!isView && (
              <Button
                onClick={() => formRef.current?.requestSubmit()}
                disabled={isPending}
              >
                {isPending ? '저장 중...' : '저장'}
              </Button>
            )}
          </div>
        </div>

        {mutationError && (
          <div className="px-4 pt-2">
            <ErrorAlert error={mutationError as unknown as ApiError} />
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="px-4 pt-2">
            <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium mb-1">입력값을 확인하세요</p>
              <ul className="list-disc list-inside space-y-0.5">
                {validationErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          className="flex-1 flex overflow-hidden"
        >
          {/* Left: Flow Canvas */}
          <FlowCanvas
            mode={flowMode}
            nodes={nodes}
            edges={edges}
            onNodeSelect={onNodeSelect}
            className="flex-1 h-full"
          />

          {/* Right: Side Panel */}
          <div className="w-[380px] border-l overflow-y-auto bg-white flow-side-panel">
            {selectedPanel.type === 'info' && (
              <WorkflowInfoPanel
                form={form}
                isEdit={isEdit}
                gits={gitsQuery.data ?? []}
                mcpServers={mcpQuery.data ?? []}
              />
            )}
            {selectedPanel.type === 'work' && (
              <WorkNodePanel
                form={form}
                workIndex={selectedPanel.workIndex}
                gits={gitsQuery.data ?? []}
                mcpServers={mcpQuery.data ?? []}
                workflowGitRefs={form.watch('gitRefs') ?? []}
                workflowMcpRefs={form.watch('mcpServerRefs') ?? []}
                workDefinitions={form.watch('workDefinitions') ?? []}
                onAddTask={() => {
                  const workIndex = selectedPanel.workIndex;
                  const tasks = form.getValues(`workDefinitions.${workIndex}.taskDefinitions`);
                  const taskArray = tasks ?? [];
                  form.setValue(`workDefinitions.${workIndex}.taskDefinitions`, [
                    ...taskArray,
                    { order: taskArray.length, query: '' },
                  ]);
                }}
                onDeleteWork={() => {
                  workDefsArray.remove(selectedPanel.workIndex);
                  setSelectedPanel({ type: 'info' });
                }}
                onMoveUp={() => {
                  const wi = selectedPanel.workIndex;
                  if (wi > 0) {
                    workDefsArray.swap(wi, wi - 1);
                    setSelectedPanel({ type: 'work', workIndex: wi - 1 });
                  }
                }}
                onMoveDown={() => {
                  const wi = selectedPanel.workIndex;
                  if (wi < workDefsArray.fields.length - 1) {
                    workDefsArray.swap(wi, wi + 1);
                    setSelectedPanel({ type: 'work', workIndex: wi + 1 });
                  }
                }}
                canMoveUp={selectedPanel.workIndex > 0}
                canMoveDown={selectedPanel.workIndex < workDefsArray.fields.length - 1}
              />
            )}
            {selectedPanel.type === 'task' && (
              <TaskNodePanel
                form={form}
                workIndex={selectedPanel.workIndex}
                taskIndex={selectedPanel.taskIndex}
                onDeleteTask={() => {
                  const workIndex = selectedPanel.workIndex;
                  const taskIndex = selectedPanel.taskIndex;
                  const tasks = form.getValues(`workDefinitions.${workIndex}.taskDefinitions`);
                  if (tasks.length > 1) {
                    form.setValue(
                      `workDefinitions.${workIndex}.taskDefinitions`,
                      tasks.filter((_, i) => i !== taskIndex),
                    );
                    setSelectedPanel({ type: 'work', workIndex });
                  }
                }}
              />
            )}
          </div>
        </form>
      </div>
    </ReactFlowProvider>
  );
}
