import ReactMarkdown from 'react-markdown';
import { useReport } from '@/hooks/useWorkflowRuns';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FileText } from 'lucide-react';

interface ReportViewerPanelProps {
  workExecutionId: string;
  isRunning?: boolean;
}

export function ReportViewerPanel({ workExecutionId, isRunning }: ReportViewerPanelProps) {
  const reportQuery = useReport(workExecutionId, isRunning ?? false);

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold text-sm">리포트</h3>
      {reportQuery.isLoading ? (
        <LoadingSpinner />
      ) : reportQuery.data?.content ? (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{reportQuery.data.content}</ReactMarkdown>
        </div>
      ) : isRunning ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <FileText className="h-8 w-8" />
          <p className="text-sm">에이전트가 작업 중입니다...</p>
          <p className="text-xs">리포트가 생성되면 자동으로 표시됩니다.</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">리포트가 아직 없습니다.</p>
      )}
    </div>
  );
}
