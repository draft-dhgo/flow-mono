import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useWorkspaceDetail } from '@/hooks/useWorkspaces';
import { Send, MessageSquare, Wrench, AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import type { AgentLogEntryResponse } from '@/api/types';

interface ChatPanelProps {
  workspaceId: string;
  isActive: boolean;
}

interface ToolGroup {
  type: 'tool_group';
  entries: AgentLogEntryResponse[];
}

type DisplayItem = { type: 'entry'; entry: AgentLogEntryResponse } | ToolGroup;

function groupEntries(entries: AgentLogEntryResponse[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  let currentToolGroup: AgentLogEntryResponse[] = [];

  const flushToolGroup = () => {
    if (currentToolGroup.length > 0) {
      items.push({ type: 'tool_group', entries: [...currentToolGroup] });
      currentToolGroup = [];
    }
  };

  for (const entry of entries) {
    if (entry.entryType === 'tool_use' || entry.entryType === 'tool_result') {
      currentToolGroup.push(entry);
    } else {
      flushToolGroup();
      items.push({ type: 'entry', entry });
    }
  }
  flushToolGroup();
  return items;
}

function ToolGroupItem({ entries }: { entries: AgentLogEntryResponse[] }) {
  const [expanded, setExpanded] = useState(false);
  const toolNames = entries
    .filter((e) => e.entryType === 'tool_use')
    .map((e) => e.content.toolName ?? 'unknown');
  const counts = new Map<string, number>();
  for (const name of toolNames) counts.set(name, (counts.get(name) ?? 0) + 1);
  const summary = [...counts.entries()].map(([n, c]) => (c > 1 ? `${n} x${c}` : n)).join(', ');

  return (
    <div className="border rounded-md bg-muted/30">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Wrench className="h-3 w-3" />
        <span className="truncate">{summary}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {entries.map((e) => (
            <div key={e.id} className="text-xs text-muted-foreground font-mono">
              {e.entryType === 'tool_use' && (
                <span>Tool: {e.content.toolName}</span>
              )}
              {e.entryType === 'tool_result' && e.content.text && (
                <p className="whitespace-pre-wrap break-all max-h-32 overflow-auto">
                  {e.content.text.slice(0, 500)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({ workspaceId, isActive }: ChatPanelProps) {
  const { chatMutation, agentLogsQuery } = useWorkspaceDetail(workspaceId);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const entries = agentLogsQuery.data ?? [];
  const displayItems = groupEntries(entries);

  useEffect(() => {
    if (entries.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCountRef.current = entries.length;
  }, [entries.length]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage('');
    chatMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="p-3 border-b font-medium text-sm">채팅</div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {entries.length === 0 && !agentLogsQuery.isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">
            에이전트에게 메시지를 보내세요.
          </p>
        )}
        {agentLogsQuery.isLoading && <LoadingSpinner />}
        {displayItems.map((item, idx) => {
          if (item.type === 'tool_group') {
            return <ToolGroupItem key={`tg-${idx}`} entries={item.entries} />;
          }
          const e = item.entry;
          if (e.entryType === 'assistant_text') {
            return (
              <div key={e.id} className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-3 text-sm whitespace-pre-wrap">
                <MessageSquare className="h-3 w-3 inline mr-1 text-blue-500" />
                {e.content.text}
              </div>
            );
          }
          if (e.entryType === 'result_summary') {
            return (
              <div key={e.id} className="bg-green-50 dark:bg-green-950/30 rounded-md p-3 text-xs">
                <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-600" />
                {e.content.durationMs != null && <span>실행: {(e.content.durationMs / 1000).toFixed(1)}s </span>}
                {e.content.totalCostUsd != null && <span>비용: ${e.content.totalCostUsd.toFixed(4)} </span>}
                {e.content.numTurns != null && <span>턴: {e.content.numTurns}</span>}
              </div>
            );
          }
          if (e.entryType === 'error') {
            return (
              <div key={e.id} className="bg-red-50 dark:bg-red-950/30 rounded-md p-3 text-sm">
                <AlertCircle className="h-3 w-3 inline mr-1 text-red-500" />
                {e.content.errorMessage ?? e.content.text}
              </div>
            );
          }
          if (e.entryType === 'system_init') {
            return (
              <div key={e.id} className="text-xs text-muted-foreground text-center py-1">
                세션 시작
              </div>
            );
          }
          return null;
        })}
        {chatMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <LoadingSpinner /> 응답 대기 중...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isActive ? '메시지를 입력하세요...' : '완료된 워크스페이스입니다'}
            disabled={!isActive || chatMutation.isPending}
            rows={2}
            className="resize-none"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!isActive || !message.trim() || chatMutation.isPending}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
