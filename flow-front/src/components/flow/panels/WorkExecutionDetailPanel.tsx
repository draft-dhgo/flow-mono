import { useState } from 'react';
import { AgentLogPanel } from './AgentLogPanel';
import { ReportViewerPanel } from './ReportViewerPanel';
import { cn } from '@/lib/utils';

interface WorkExecutionDetailPanelProps {
  runId: string;
  workExecutionId: string;
  isRunning: boolean;
}

type Tab = 'logs' | 'report';

export function WorkExecutionDetailPanel({
  runId,
  workExecutionId,
  isRunning,
}: WorkExecutionDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('logs');

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b">
        <button
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'logs'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setActiveTab('logs')}
        >
          에이전트 로그
        </button>
        <button
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'report'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setActiveTab('report')}
        >
          리포트
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'logs' && (
          <AgentLogPanel
            runId={runId}
            workExecutionId={workExecutionId}
            isRunning={isRunning}
          />
        )}
        {activeTab === 'report' && (
          <ReportViewerPanel
            workExecutionId={workExecutionId}
            isRunning={isRunning}
          />
        )}
      </div>
    </div>
  );
}
