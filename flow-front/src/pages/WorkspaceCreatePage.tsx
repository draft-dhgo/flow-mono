import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorAlert } from '@/components/ErrorAlert';
import { useWorkspaceList } from '@/hooks/useWorkspaces';
import { useGits } from '@/hooks/useGits';
import { useMcpServers } from '@/hooks/useMcpServers';
import { MODEL_OPTIONS } from '@/lib/constants';
import type { CreateWorkspaceRequest } from '@/api/types';
import { Plus, Trash2 } from 'lucide-react';

interface GitRefEntry {
  gitId: string;
  baseBranch: string;
  branchName: string;
}

interface McpServerRefEntry {
  mcpServerId: string;
}

export function WorkspaceCreatePage() {
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
    };
    createMutation.mutate(data, {
      onSuccess: (result) => {
        navigate(`/workspaces/${result.workspaceId}`);
      },
    });
  };

  const isValid = name.trim() !== '' && gitRefs.length > 0 && gitRefs.every((r) => r.branchName.trim() !== '');

  return (
    <div className="max-w-2xl">
      <PageHeader title="새 워크스페이스" />

      {createMutation.isError && (
        <div className="mb-4">
          <ErrorAlert error={createMutation.error} />
        </div>
      )}

      <div className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ws-name">이름</label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="워크스페이스 이름"
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
            <p className="text-sm text-muted-foreground">Git 레포지토리를 추가하세요.</p>
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
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">기본 브랜치</label>
                  <Input
                    value={ref.baseBranch}
                    onChange={(e) => updateGitRef(index, 'baseBranch', e.target.value)}
                    placeholder="main"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">새 브랜치명</label>
                  <Input
                    value={ref.branchName}
                    onChange={(e) => updateGitRef(index, 'branchName', e.target.value)}
                    placeholder="workspace/my-feature"
                  />
                </div>
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
            {createMutation.isPending ? '생성 중...' : '워크스페이스 생성'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/workspaces')}>
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}
