import { useState, useRef, useEffect } from 'react';
import { useAgentLogs } from '@/hooks/useAgentLogs';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { AgentLogEntryResponse } from '@/api/types';
import {
  Terminal, MessageSquare, Wrench, CheckCircle2, AlertCircle, Play,
  ChevronDown, ChevronRight,
} from 'lucide-react';

interface AgentLogPanelProps {
  runId: string;
  workExecutionId: string;
  isRunning: boolean;
}

// Group consecutive tool_use/tool_result entries
interface ToolGroup {
  type: 'tool_group';
  tools: Map<string, number>; // toolName → count
  entries: AgentLogEntryResponse[];
}

type DisplayItem =
  | { type: 'entry'; entry: AgentLogEntryResponse }
  | ToolGroup;

function groupEntries(entries: AgentLogEntryResponse[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  let currentToolGroup: ToolGroup | null = null;

  for (const entry of entries) {
    if (entry.entryType === 'tool_use' || entry.entryType === 'tool_result') {
      if (!currentToolGroup) {
        currentToolGroup = { type: 'tool_group', tools: new Map(), entries: [] };
      }
      currentToolGroup.entries.push(entry);
      if (entry.entryType === 'tool_use' && entry.content.toolName) {
        const name = entry.content.toolName;
        currentToolGroup.tools.set(name, (currentToolGroup.tools.get(name) ?? 0) + 1);
      }
    } else {
      if (currentToolGroup) {
        items.push(currentToolGroup);
        currentToolGroup = null;
      }
      items.push({ type: 'entry', entry });
    }
  }

  if (currentToolGroup) {
    items.push(currentToolGroup);
  }

  return items;
}

function ToolGroupItem({ group }: { group: ToolGroup }) {
  const [expanded, setExpanded] = useState(false);
  const summary = Array.from(group.tools.entries())
    .map(([name, count]) => `${name} ×${count}`)
    .join(', ');

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        className="flex items-center gap-2 w-full px-2 py-1.5 text-xs bg-muted/50 hover:bg-muted text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Wrench className="h-3 w-3 text-orange-500" />
        <span className="font-medium">{summary}</span>
      </button>
      {expanded && (
        <div className="px-2 py-1 space-y-1 bg-muted/20">
          {group.entries.map((e) => (
            <div key={e.id} className="text-xs text-muted-foreground truncate">
              {e.entryType === 'tool_use' && (
                <span>
                  <span className="font-medium text-orange-600">{e.content.toolName}</span>
                  {e.content.toolInput && (
                    <span className="ml-1 opacity-60">{e.content.toolInput.slice(0, 80)}</span>
                  )}
                </span>
              )}
              {e.entryType === 'tool_result' && (
                <span className="opacity-60">{e.content.text?.slice(0, 100)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TextEntry({ entry }: { entry: AgentLogEntryResponse }) {
  const [expanded, setExpanded] = useState(false);
  const text = entry.content.text ?? '';
  const isLong = text.length > 200;

  return (
    <div className="flex items-start gap-2 text-xs">
      <MessageSquare className="h-3 w-3 mt-0.5 text-blue-500 shrink-0" />
      <div className="min-w-0">
        <p className="whitespace-pre-wrap break-words">
          {isLong && !expanded ? text.slice(0, 200) + '…' : text}
        </p>
        {isLong && (
          <button
            className="text-blue-500 hover:underline mt-0.5"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '접기' : '더 보기'}
          </button>
        )}
      </div>
    </div>
  );
}

function ResultEntry({ entry }: { entry: AgentLogEntryResponse }) {
  const c = entry.content;
  return (
    <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded px-2 py-1.5">
      <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
      <div className="flex gap-3 flex-wrap">
        {c.durationMs != null && <span>{(c.durationMs / 1000).toFixed(1)}s</span>}
        {c.totalCostUsd != null && <span>${c.totalCostUsd.toFixed(4)}</span>}
        {c.numTurns != null && <span>{c.numTurns} turns</span>}
        {c.usage && (
          <span className="text-muted-foreground">
            {c.usage.inputTokens + c.usage.outputTokens} tokens
          </span>
        )}
      </div>
    </div>
  );
}

export function AgentLogPanel({ runId, workExecutionId, isRunning }: AgentLogPanelProps) {
  const { data: entries, isLoading } = useAgentLogs(runId, workExecutionId, isRunning);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Auto-scroll on new entries
  useEffect(() => {
    const count = entries?.length ?? 0;
    if (count > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCountRef.current = count;
  }, [entries?.length]);

  if (isLoading) return <LoadingSpinner />;

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
        <Terminal className="h-8 w-8" />
        <p className="text-sm">
          {isRunning ? '에이전트 로그를 기다리는 중...' : '로그가 없습니다.'}
        </p>
      </div>
    );
  }

  const displayItems = groupEntries(entries);

  return (
    <div ref={scrollRef} className="space-y-2 max-h-[60vh] overflow-y-auto">
      {displayItems.map((item, idx) => {
        if (item.type === 'tool_group') {
          return <ToolGroupItem key={`tg-${idx}`} group={item} />;
        }

        const entry = item.entry;
        switch (entry.entryType) {
          case 'system_init':
            return (
              <div key={entry.id} className="flex items-center gap-2 text-xs">
                <Play className="h-3 w-3 text-green-500" />
                <span className="font-medium text-green-600">세션 시작</span>
              </div>
            );
          case 'assistant_text':
            return <TextEntry key={entry.id} entry={entry} />;
          case 'result_summary':
            return <ResultEntry key={entry.id} entry={entry} />;
          case 'error':
            return (
              <div key={entry.id} className="flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{entry.content.errorMessage ?? entry.content.text}</span>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
