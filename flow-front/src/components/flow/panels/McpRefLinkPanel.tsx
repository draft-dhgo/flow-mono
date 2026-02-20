import type { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Link2 } from 'lucide-react';

interface McpRefLinkPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  workIndex: number;
  workflowMcpRefs: { mcpServerId: string; envOverrides?: Record<string, string> }[];
  mcpServers: { id: string; name: string }[];
}

export function McpRefLinkPanel({
  form,
  workIndex,
  workflowMcpRefs,
  mcpServers,
}: McpRefLinkPanelProps) {
  const fieldPath = `workDefinitions.${workIndex}.mcpServerRefs` as const;
  const currentRefs: { mcpServerId: string; envOverrides?: Record<string, string> }[] =
    form.watch(fieldPath) ?? [];

  const isLinked = (mcpServerId: string) =>
    currentRefs.some((r) => r.mcpServerId === mcpServerId);

  const toggle = (ref: { mcpServerId: string; envOverrides?: Record<string, string> }) => {
    if (isLinked(ref.mcpServerId)) {
      form.setValue(
        fieldPath,
        currentRefs.filter((r) => r.mcpServerId !== ref.mcpServerId),
      );
    } else {
      form.setValue(fieldPath, [
        ...currentRefs,
        { mcpServerId: ref.mcpServerId, envOverrides: ref.envOverrides ?? {} },
      ]);
    }
  };

  const mcpNameMap = new Map(mcpServers.map((m) => [m.id, m.name]));

  if (workflowMcpRefs.length === 0) {
    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          MCP 서버 연결
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          워크플로우에 등록된 MCP 서버가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        <label className="text-sm font-medium">MCP 서버 연결</label>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        이 워크노드에서 사용할 MCP 서버를 선택하세요.
      </p>
      <div className="space-y-1.5">
        {workflowMcpRefs.map((ref) => (
          <label
            key={ref.mcpServerId}
            className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              checked={isLinked(ref.mcpServerId)}
              onCheckedChange={() => toggle(ref)}
            />
            <span className="text-sm font-medium truncate">
              {mcpNameMap.get(ref.mcpServerId) ?? ref.mcpServerId}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
