import type { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Link2 } from 'lucide-react';

interface GitRefLinkPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  workIndex: number;
  workflowGitRefs: { gitId: string; baseBranch: string }[];
  gits: { id: string; url: string }[];
}

export function GitRefLinkPanel({
  form,
  workIndex,
  workflowGitRefs,
  gits,
}: GitRefLinkPanelProps) {
  const fieldPath = `workDefinitions.${workIndex}.gitRefs` as const;
  const currentRefs: { gitId: string; baseBranch: string }[] =
    form.watch(fieldPath) ?? [];

  const isLinked = (gitId: string) =>
    currentRefs.some((r) => r.gitId === gitId);

  const toggle = (ref: { gitId: string; baseBranch: string }) => {
    if (isLinked(ref.gitId)) {
      form.setValue(
        fieldPath,
        currentRefs.filter((r) => r.gitId !== ref.gitId),
      );
    } else {
      form.setValue(fieldPath, [
        ...currentRefs,
        { gitId: ref.gitId, baseBranch: ref.baseBranch },
      ]);
    }
  };

  const gitNameMap = new Map(gits.map((g) => [g.id, g.url]));

  if (workflowGitRefs.length === 0) {
    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          Git 연결
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          워크플로우에 등록된 Git 저장소가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        <label className="text-sm font-medium">Git 연결</label>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        작업공간에 링크할 Git 저장소를 선택하세요.
      </p>
      <div className="space-y-1.5">
        {workflowGitRefs.map((ref) => (
          <label
            key={ref.gitId}
            className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              checked={isLinked(ref.gitId)}
              onCheckedChange={() => toggle(ref)}
            />
            <div className="text-sm truncate">
              <span className="font-medium">
                {gitNameMap.get(ref.gitId) ?? ref.gitId}
              </span>
              <span className="text-muted-foreground ml-1.5">
                ({ref.baseBranch})
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
