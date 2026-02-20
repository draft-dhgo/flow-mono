import type { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MODEL_OPTIONS } from '@/lib/constants';
import { GitRefLinkPanel } from './GitRefLinkPanel';
import { McpRefLinkPanel } from './McpRefLinkPanel';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface WorkNodePanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  workIndex: number;
  gits: { id: string; url: string }[];
  mcpServers: { id: string; name: string }[];
  workflowGitRefs: { gitId: string; baseBranch: string }[];
  workflowMcpRefs: { mcpServerId: string; envOverrides?: Record<string, string> }[];
  onAddTask: () => void;
  onDeleteWork: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function WorkNodePanel({
  form,
  workIndex,
  gits,
  mcpServers,
  workflowGitRefs,
  workflowMcpRefs,
  onAddTask,
  onDeleteWork,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: WorkNodePanelProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Work #{workIndex + 1}</h3>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} disabled={!canMoveUp}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onMoveDown} disabled={!canMoveDown}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onDeleteWork}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">모델 *</label>
        <Select
          value={form.watch(`workDefinitions.${workIndex}.model`)}
          onValueChange={(v) => form.setValue(`workDefinitions.${workIndex}.model`, v)}
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
          id={`pause-${workIndex}`}
          checked={form.watch(`workDefinitions.${workIndex}.pauseAfter`) ?? false}
          onCheckedChange={(checked) =>
            form.setValue(`workDefinitions.${workIndex}.pauseAfter`, checked === true)
          }
        />
        <label htmlFor={`pause-${workIndex}`} className="text-sm">
          완료 후 일시정지 (pauseAfter)
        </label>
      </div>

      <GitRefLinkPanel
        form={form}
        workIndex={workIndex}
        workflowGitRefs={workflowGitRefs}
        gits={gits}
      />

      <McpRefLinkPanel
        form={form}
        workIndex={workIndex}
        workflowMcpRefs={workflowMcpRefs}
        mcpServers={mcpServers}
      />

      <div className="pt-2">
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={onAddTask}>
          <Plus className="h-3 w-3 mr-1" />
          Task 추가
        </Button>
      </div>
    </div>
  );
}
