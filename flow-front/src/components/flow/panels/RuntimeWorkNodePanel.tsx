import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MODEL_OPTIONS } from '@/lib/constants';
import type {
  WorkNodeConfigSummary,
  EditWorkNodeConfigRequest,
  AddWorkNodeRequest,
  GitRefNodeConfigInput,
  McpServerRefNodeConfigInput,
} from '@/api/types';
import { Plus, X, Trash2 } from 'lucide-react';

interface RuntimeWorkNodePanelProps {
  nodeConfig?: WorkNodeConfigSummary;
  sequence: number;
  isEditable: boolean;
  onEdit: (config: EditWorkNodeConfigRequest) => void;
  onDelete: () => void;
  onAdd: (config: AddWorkNodeRequest) => void;
  isEditPending: boolean;
  isDeletePending: boolean;
  isAddPending: boolean;
  mode: 'edit' | 'add';
  gitRefPool?: { gitId: string; baseBranch: string }[];
  mcpServerRefPool?: { mcpServerId: string; envOverrides: Record<string, string> }[];
}

export function RuntimeWorkNodePanel({
  nodeConfig,
  sequence,
  isEditable,
  onEdit,
  onDelete,
  onAdd,
  isEditPending,
  isDeletePending,
  isAddPending,
  mode,
  gitRefPool = [],
  mcpServerRefPool = [],
}: RuntimeWorkNodePanelProps) {
  const form = useForm({
    defaultValues: {
      model: nodeConfig?.model ?? '',
      pauseAfter: nodeConfig?.pauseAfter ?? false,
      taskConfigs: nodeConfig?.taskConfigs?.length
        ? nodeConfig.taskConfigs.map((tc) => ({ order: tc.order, query: tc.query }))
        : [{ order: 0, query: '' }],
      gitRefConfigs: (nodeConfig?.gitRefConfigs ?? []) as GitRefNodeConfigInput[],
      mcpServerRefConfigs: (nodeConfig?.mcpServerRefConfigs ?? []) as McpServerRefNodeConfigInput[],
    },
  });

  const taskArray = useFieldArray({ control: form.control, name: 'taskConfigs' });

  const handleSubmit = form.handleSubmit((values) => {
    if (mode === 'add') {
      onAdd({
        model: values.model,
        taskConfigs: values.taskConfigs,
        pauseAfter: values.pauseAfter,
        gitRefConfigs: values.gitRefConfigs,
        mcpServerRefConfigs: values.mcpServerRefConfigs,
      });
    } else {
      onEdit({
        model: values.model,
        taskConfigs: values.taskConfigs,
        pauseAfter: values.pauseAfter,
        gitRefConfigs: values.gitRefConfigs,
        mcpServerRefConfigs: values.mcpServerRefConfigs,
      });
    }
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          {mode === 'add' ? 'Work 노드 추가' : `Work #${sequence + 1} 편집`}
        </h3>
        {isEditable && mode === 'edit' && (
          <Button variant="ghost" size="icon" onClick={onDelete} disabled={isDeletePending}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        )}
      </div>

      {!isEditable && mode === 'edit' ? (
        <p className="text-sm text-muted-foreground">
          이 Work 노드는 편집할 수 없습니다.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">모델</label>
            <Select
              value={form.watch('model')}
              onValueChange={(v) => form.setValue('model', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="모델 선택" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`runtime-pause-${sequence}`}
              checked={form.watch('pauseAfter')}
              onCheckedChange={(c) => form.setValue('pauseAfter', c === true)}
            />
            <label htmlFor={`runtime-pause-${sequence}`} className="text-sm">
              완료 후 일시정지
            </label>
          </div>

          {gitRefPool.length > 0 && (
            <div>
              <label className="text-sm font-medium">Git Refs</label>
              <div className="space-y-1 mt-1">
                {gitRefPool.map((g) => {
                  const selected = form.watch('gitRefConfigs');
                  const isChecked = selected.some((s) => s.gitId === g.gitId);
                  return (
                    <div key={g.gitId} className="flex items-center gap-2">
                      <Checkbox
                        id={`git-${g.gitId}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const current = form.getValues('gitRefConfigs');
                          if (checked) {
                            form.setValue('gitRefConfigs', [
                              ...current,
                              { gitId: g.gitId, baseBranch: g.baseBranch },
                            ]);
                          } else {
                            form.setValue(
                              'gitRefConfigs',
                              current.filter((c) => c.gitId !== g.gitId),
                            );
                          }
                        }}
                      />
                      <label htmlFor={`git-${g.gitId}`} className="text-xs">
                        {g.gitId} ({g.baseBranch})
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {mcpServerRefPool.length > 0 && (
            <div>
              <label className="text-sm font-medium">MCP Servers</label>
              <div className="space-y-1 mt-1">
                {mcpServerRefPool.map((m) => {
                  const selected = form.watch('mcpServerRefConfigs');
                  const isChecked = selected.some((s) => s.mcpServerId === m.mcpServerId);
                  return (
                    <div key={m.mcpServerId} className="flex items-center gap-2">
                      <Checkbox
                        id={`mcp-${m.mcpServerId}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const current = form.getValues('mcpServerRefConfigs');
                          if (checked) {
                            form.setValue('mcpServerRefConfigs', [
                              ...current,
                              { mcpServerId: m.mcpServerId, envOverrides: m.envOverrides },
                            ]);
                          } else {
                            form.setValue(
                              'mcpServerRefConfigs',
                              current.filter((c) => c.mcpServerId !== m.mcpServerId),
                            );
                          }
                        }}
                      />
                      <label htmlFor={`mcp-${m.mcpServerId}`} className="text-xs">
                        {m.mcpServerId}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Tasks</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => taskArray.append({ order: taskArray.fields.length, query: '' })}
              >
                <Plus className="h-3 w-3 mr-1" />
                Task 추가
              </Button>
            </div>
            {taskArray.fields.map((f, i) => (
              <div key={f.id} className="flex gap-2 mb-2">
                <Input
                  {...form.register(`taskConfigs.${i}.query`)}
                  placeholder="쿼리"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => taskArray.remove(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={mode === 'add' ? isAddPending : isEditPending}
          >
            {mode === 'add'
              ? isAddPending ? '추가 중...' : '추가'
              : isEditPending ? '저장 중...' : '저장'}
          </Button>
        </form>
      )}
    </div>
  );
}
