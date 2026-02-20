import type { UseFormReturn } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Trash2 } from 'lucide-react';

interface TaskNodePanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  workIndex: number;
  taskIndex: number;
  onDeleteTask: () => void;
}

export function TaskNodePanel({ form, workIndex, taskIndex, onDeleteTask }: TaskNodePanelProps) {
  const sectionsPath = `workDefinitions.${workIndex}.taskDefinitions.${taskIndex}.reportOutline.sections`;
  const sectionsArray = useFieldArray({
    control: form.control,
    name: sectionsPath,
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          Work #{workIndex + 1} / Task #{taskIndex + 1}
        </h3>
        <Button type="button" variant="ghost" size="icon" onClick={onDeleteTask}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      <div>
        <label className="text-sm font-medium">쿼리 *</label>
        <Textarea
          {...form.register(`workDefinitions.${workIndex}.taskDefinitions.${taskIndex}.query`)}
          rows={4}
        />
        {(form.formState.errors.workDefinitions as Record<string, unknown>)?.[workIndex]?.taskDefinitions?.[taskIndex]?.query && (
          <p className="text-sm text-red-500 mt-1">쿼리는 필수입니다</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-muted-foreground">리포트 아웃라인</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => sectionsArray.append({ title: '', description: '' })}
          >
            <Plus className="h-3 w-3 mr-1" />
            섹션 추가
          </Button>
        </div>
        {sectionsArray.fields.map((secField, secIndex) => (
          <div key={secField.id} className="flex gap-2 mb-2">
            <Input
              {...form.register(`${sectionsPath}.${secIndex}.title`)}
              placeholder="타이틀"
              className="flex-1"
            />
            <Input
              {...form.register(`${sectionsPath}.${secIndex}.description`)}
              placeholder="설명"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => sectionsArray.remove(secIndex)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
