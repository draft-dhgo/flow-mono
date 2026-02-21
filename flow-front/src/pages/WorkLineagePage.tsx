import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkLineage } from '@/hooks/useWorkLineage';
import { workLineageApi } from '@/api/work-lineage';
import { workspacesApi } from '@/api/workspaces';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MergeDialog } from '@/components/MergeDialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Copy, Download, GitMerge } from 'lucide-react';
import { RUN_STATUS_COLOR, RUN_STATUS_LABEL } from '@/lib/constants';
import type { WorkflowRunStatus, WorkLineageRunInfo, WorkLineageRepoInfo } from '@/api/types';

function extractProjectName(gitUrl: string): string {
  return gitUrl.split('/').pop()?.replace('.git', '') ?? gitUrl;
}

export function WorkLineagePage() {
  const navigate = useNavigate();
  const { lineageQuery } = useWorkLineage();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);

  const toggleKey = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleRunSelection = (runId: string) => {
    setSelectedRunIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  };

  const handleCopyMarkdown = async () => {
    const markdown = await workLineageApi.exportLineage();
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = async () => {
    const markdown = await workLineageApi.exportLineage();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'work-lineage.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMerge = async (workspaceId: string) => {
    setMergeLoading(true);
    try {
      await workspacesApi.mergeBranches(workspaceId, {
        workflowRunIds: [...selectedRunIds],
      });
      setMergeDialogOpen(false);
      setSelectedRunIds(new Set());
      navigate(`/workspaces/${workspaceId}`);
    } finally {
      setMergeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="작업 리니지">
        <div className="flex gap-2">
          {selectedRunIds.size > 0 && (
            <Button size="sm" onClick={() => setMergeDialogOpen(true)}>
              <GitMerge className="h-4 w-4 mr-1.5" />
              통합 ({selectedRunIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCopyMarkdown}>
            <Copy className="h-4 w-4 mr-1.5" />
            {copied ? '복사됨!' : '마크다운 복사'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadMarkdown}>
            <Download className="h-4 w-4 mr-1.5" />
            마크다운 다운로드
          </Button>
        </div>
      </PageHeader>

      {lineageQuery.isLoading && <LoadingSpinner message="리니지 데이터를 불러오는 중..." />}

      {lineageQuery.data && lineageQuery.data.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          리니지 데이터가 없습니다.
        </div>
      )}

      {lineageQuery.data &&
        lineageQuery.data.map((entry) => {
          const isExpanded = expandedKeys.has(entry.issueKey);
          return (
            <div key={entry.issueKey} className="border rounded-lg">
              <div
                className="cursor-pointer flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => toggleKey(entry.issueKey)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-semibold">{entry.issueKey}</span>
                  <span className="text-muted-foreground text-sm">
                    {entry.runs.length}개 실행
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="w-8 py-2 px-2" />
                        <th className="text-left py-2 px-2">워크플로우</th>
                        <th className="text-left py-2 px-2">상태</th>
                        <th className="text-left py-2 px-2">프로젝트</th>
                        <th className="text-left py-2 px-2">브랜치</th>
                        <th className="text-left py-2 px-2">커밋 해시</th>
                        <th className="text-right py-2 px-2">커밋 수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.runs.map((runInfo: WorkLineageRunInfo) => {
                        const isCompleted = runInfo.runStatus === 'COMPLETED';
                        return runInfo.repos.length === 0 ? (
                          <tr key={runInfo.workflowRunId} className="border-b last:border-0">
                            <td className="py-2 px-2">
                              <input
                                type="checkbox"
                                checked={selectedRunIds.has(runInfo.workflowRunId)}
                                disabled={!isCompleted}
                                onChange={() => toggleRunSelection(runInfo.workflowRunId)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="py-2 px-2">{runInfo.workflowName}</td>
                            <td className="py-2 px-2">
                              <StatusBadge status={runInfo.runStatus} />
                            </td>
                            <td className="py-2 px-2 text-muted-foreground" colSpan={4}>
                              -
                            </td>
                          </tr>
                        ) : (
                          runInfo.repos.map((repo: WorkLineageRepoInfo, idx: number) => (
                            <tr
                              key={`${runInfo.workflowRunId}-${repo.gitId}`}
                              className="border-b last:border-0"
                            >
                              <td className="py-2 px-2">
                                {idx === 0 && (
                                  <input
                                    type="checkbox"
                                    checked={selectedRunIds.has(runInfo.workflowRunId)}
                                    disabled={!isCompleted}
                                    onChange={() => toggleRunSelection(runInfo.workflowRunId)}
                                    className="rounded border-gray-300"
                                  />
                                )}
                              </td>
                              <td className="py-2 px-2">
                                {idx === 0 ? runInfo.workflowName : ''}
                              </td>
                              <td className="py-2 px-2">
                                {idx === 0 ? <StatusBadge status={runInfo.runStatus} /> : ''}
                              </td>
                              <td className="py-2 px-2">{extractProjectName(repo.gitUrl)}</td>
                              <td className="py-2 px-2">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {repo.branch}
                                </code>
                              </td>
                              <td className="py-2 px-2">
                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                  {repo.commitHash === 'N/A'
                                    ? 'N/A'
                                    : repo.commitHash.substring(0, 7)}
                                </code>
                              </td>
                              <td className="py-2 px-2 text-right">{repo.commitCount}</td>
                            </tr>
                          ))
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

      <MergeDialog
        open={mergeDialogOpen}
        onClose={() => setMergeDialogOpen(false)}
        selectedRunIds={[...selectedRunIds]}
        onMerge={handleMerge}
        loading={mergeLoading}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorClass = RUN_STATUS_COLOR[status as WorkflowRunStatus] ?? 'bg-gray-100 text-gray-800';
  const label = RUN_STATUS_LABEL[status as WorkflowRunStatus] ?? status;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
