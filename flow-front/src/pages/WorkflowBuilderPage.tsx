import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { WorkflowPreviewCanvas } from '@/components/workspace/WorkflowPreviewCanvas';
import { useWorkspaceDetail, useWorkspaceList } from '@/hooks/useWorkspaces';
import { useGits } from '@/hooks/useGits';
import { useMcpServers } from '@/hooks/useMcpServers';
import { MODEL_OPTIONS } from '@/lib/constants';
import type { CreateWorkspaceRequest } from '@/api/types';
import { Plus, Trash2, CheckCircle, Sparkles } from 'lucide-react';

// ─── Create Mode ───

interface GitRefEntry {
  gitId: string;
  baseBranch: string;
  branchName: string;
}

interface McpServerRefEntry {
  mcpServerId: string;
}

function BuilderCreateForm() {
  const navigate = useNavigate();
  const { createMutation } = useWorkspaceList();
  const { listQuery: gitsQuery } = useGits();
  const { listQuery: mcpQuery } = useMcpServers();

  const [name, setName] = useState('');
  const [model, setModel] = useState<string>(MODEL_OPTIONS[0].value);
  const [gitRefs, setGitRefs] = useState<GitRefEntry[]>([]);
  const [mcpServerRefs, setMcpServerRefs] = useState<McpServerRefEntry[]>([]);

  const addGitRef = () => {
    const gits = gitsQuery.data ?? [];
    const usedIds = new Set(gitRefs.map((r) => r.gitId));
    const available = gits.find((g) => !usedIds.has(g.id));
    if (available) {
      setGitRefs([...gitRefs, { gitId: available.id, baseBranch: 'main', branchName: '' }]);
    }
  };

  const removeGitRef = (index: number) => {
    setGitRefs(gitRefs.filter((_, i) => i !== index));
  };

  const updateGitRef = (index: number, field: keyof GitRefEntry, value: string) => {
    setGitRefs(gitRefs.map((ref, i) => (i === index ? { ...ref, [field]: value } : ref)));
  };

  const toggleMcpServer = (mcpServerId: string) => {
    setMcpServerRefs((prev) =>
      prev.some((r) => r.mcpServerId === mcpServerId)
        ? prev.filter((r) => r.mcpServerId !== mcpServerId)
        : [...prev, { mcpServerId }],
    );
  };

  const handleSubmit = () => {
    const data: CreateWorkspaceRequest = {
      name,
      model,
      gitRefs,
      mcpServerRefs: mcpServerRefs.map((r) => ({ mcpServerId: r.mcpServerId })),
      purpose: 'WORKFLOW_BUILDER',
    };
    createMutation.mutate(data, {
      onSuccess: (result) => {
        navigate(`/workflow-builder/${result.workspaceId}`);
      },
    });
  };

  const isValid = name.trim() !== '' && gitRefs.length > 0 && gitRefs.every((r) => r.baseBranch.trim() !== '');

  return (
    <div className="max-w-2xl">
      <PageHeader title="새 워크플로우 빌더 세션" />

      {createMutation.isError && (
        <div className="mb-4">
          <ErrorAlert error={createMutation.error} />
        </div>
      )}

      <div className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="builder-name">세션 이름</label>
          <Input
            id="builder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="워크플로우 빌더 세션 이름"
          />
        </div>

        {/* Model */}
        <div className="space-y-2">
          <label className="text-sm font-medium">모델</label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Git Refs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Git 레포지토리</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addGitRef}
              disabled={gitRefs.length >= (gitsQuery.data?.length ?? 0)}
            >
              <Plus className="h-3 w-3 mr-1" />추가
            </Button>
          </div>
          {gitRefs.length === 0 && (
            <p className="text-sm text-muted-foreground">에이전트가 코드를 탐색할 Git 레포지토리를 추가하세요.</p>
          )}
          {gitRefs.map((ref, index) => (
            <div key={index} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">레포지토리</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeGitRef(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Select
                value={ref.gitId}
                onValueChange={(v) => updateGitRef(index, 'gitId', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(gitsQuery.data ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.url}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <label className="text-xs font-medium">기본 브랜치</label>
                <Input
                  value={ref.baseBranch}
                  onChange={(e) => updateGitRef(index, 'baseBranch', e.target.value)}
                  placeholder="main"
                />
              </div>
            </div>
          ))}
        </div>

        {/* MCP Servers */}
        <div className="space-y-2">
          <label className="text-sm font-medium">MCP 서버 (선택)</label>
          {(mcpQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 MCP 서버가 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {(mcpQuery.data ?? []).map((server) => (
                <label key={server.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mcpServerRefs.some((r) => r.mcpServerId === server.id)}
                    onChange={() => toggleMcpServer(server.id)}
                  />
                  {server.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={!isValid || createMutation.isPending}>
            {createMutation.isPending ? '생성 중...' : '빌더 세션 생성'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/workflow-builder')}>
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Builder Mode ───

function BuilderSession({ id }: { id: string }) {
  const navigate = useNavigate();
  const {
    detailQuery,
    completeMutation,
    deleteMutation,
    workflowPreviewQuery,
    buildWorkflowMutation,
  } = useWorkspaceDetail(id);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const workspace = detailQuery.data;

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }
  if (!workspace) {
    return <div className="p-4 text-sm text-muted-foreground">세션을 찾을 수 없습니다.</div>;
  }

  const isActive = workspace.status === 'ACTIVE';
  const preview = workflowPreviewQuery.data ?? null;

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => navigate('/workflow-builder'),
    });
  };

  const handleComplete = () => {
    completeMutation.mutate(undefined, {
      onSuccess: () => setCompleteOpen(false),
    });
  };

  const handleBuild = () => {
    buildWorkflowMutation.mutate(undefined, {
      onSuccess: (result) => {
        navigate(`/workflows/${result.workflowId}`);
      },
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="shrink-0">
        <PageHeader title={workspace.name}>
          <div className="flex items-center gap-2">
            <StatusBadge status={workspace.status} type="workspace" />
            {preview && (
              <Button
                size="sm"
                onClick={handleBuild}
                disabled={buildWorkflowMutation.isPending}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {buildWorkflowMutation.isPending ? '생성 중...' : '워크플로우 생성'}
              </Button>
            )}
            {isActive && (
              <Button variant="outline" size="sm" onClick={() => setCompleteOpen(true)}>
                <CheckCircle className="h-4 w-4 mr-1" />완료
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" />삭제
            </Button>
          </div>
        </PageHeader>

        {/* Info bar */}
        <div className="flex items-center gap-4 px-1 pb-2 text-xs text-muted-foreground">
          <span>모델: {workspace.model}</span>
          {workspace.gitRefs.map((g) => (
            <span key={g.gitId}>{g.gitUrl || g.gitId} ({g.baseBranch})</span>
          ))}
        </div>

        {buildWorkflowMutation.isError && (
          <div className="px-1 pb-2">
            <ErrorAlert error={buildWorkflowMutation.error} />
          </div>
        )}
      </div>

      {/* Main content: Chat + Preview */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Chat */}
        <div className="w-[450px] shrink-0">
          <ChatPanel workspaceId={id} isActive={isActive} />
        </div>

        {/* Right: Preview canvas */}
        <div className="flex-1 border-l">
          <WorkflowPreviewCanvas
            preview={preview}
            onBuild={preview ? handleBuild : undefined}
            isBuildPending={buildWorkflowMutation.isPending}
          />
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="세션 완료"
        description="이 빌더 세션을 완료 처리하시겠습니까? 에이전트 세션이 종료됩니다."
        confirmLabel="완료"
        onConfirm={handleComplete}
        loading={completeMutation.isPending}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="세션 삭제"
        description="이 빌더 세션을 삭제하시겠습니까?"
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Page Component ───

export function WorkflowBuilderPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <BuilderCreateForm />;
  }

  return <BuilderSession id={id} />;
}
