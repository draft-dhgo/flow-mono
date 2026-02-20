import type { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText } from 'lucide-react';

interface WorkDefLike {
  order?: number;
  model: string;
  taskDefinitions: { order: number; query: string }[];
}

interface ReportRefLinkPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  workIndex: number;
  workDefinitions: WorkDefLike[];
}

export function ReportRefLinkPanel({
  form,
  workIndex,
  workDefinitions,
}: ReportRefLinkPanelProps) {
  const fieldPath = `workDefinitions.${workIndex}.reportFileRefs` as const;
  const currentRefs: number[] = form.watch(fieldPath) ?? [];

  // 자기보다 앞선 Work 중 task가 있는 것만 표시
  const availableWorks = workDefinitions
    .map((wd, i) => ({ ...wd, index: i }))
    .filter((wd) => wd.index < workIndex && wd.taskDefinitions.length > 0);

  const isLinked = (idx: number) => currentRefs.includes(idx);

  const toggle = (idx: number) => {
    if (isLinked(idx)) {
      form.setValue(
        fieldPath,
        currentRefs.filter((r) => r !== idx),
      );
    } else {
      form.setValue(fieldPath, [...currentRefs, idx]);
    }
  };

  if (availableWorks.length === 0) {
    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          리포트 참조
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          참조 가능한 이전 Work 노드가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <label className="text-sm font-medium">리포트 참조</label>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        이전 Work의 리포트를 작업공간에 심링크합니다.
      </p>
      <div className="space-y-1.5">
        {availableWorks.map((wd) => (
          <label
            key={wd.index}
            className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              checked={isLinked(wd.index)}
              onCheckedChange={() => toggle(wd.index)}
            />
            <div className="text-sm truncate">
              <span className="font-medium">
                Work #{wd.index + 1}
              </span>
              <span className="text-muted-foreground ml-1.5">
                ({wd.model || '모델 미선택'} · {wd.taskDefinitions.length} tasks)
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
