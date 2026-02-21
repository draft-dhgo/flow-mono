import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { DiffViewerPanel } from '@/components/workspace/DiffViewerPanel';
import { useWorkspaceDetail, useWorkspaceFile } from '@/hooks/useWorkspaces';
import type { FileTreeEntry } from '@/api/types';
import { PushResultDialog } from '@/components/PushResultDialog';
import { File, Folder, FolderOpen, Trash2, CheckCircle, Eye, GitCompare, Upload } from 'lucide-react';

type ViewMode = 'files' | 'diff';

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.includes('.') ? '.' + filePath.split('.').pop() : '';
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
    '.json': 'json', '.md': 'markdown',
    '.css': 'css', '.html': 'html',
    '.yaml': 'yaml', '.yml': 'yaml',
    '.py': 'python', '.sh': 'shell',
  };
  return map[ext] ?? 'plaintext';
}

interface TreeNode {
  name: string;
  fullPath: string;
  isDirectory: boolean;
  children: TreeNode[];
}

function buildTree(entries: FileTreeEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode>();

  for (const entry of entries) {
    const parts = entry.path.split('/');
    const name = parts[parts.length - 1];
    const node: TreeNode = { name, fullPath: entry.path, isDirectory: entry.isDirectory, children: [] };

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = dirMap.get(parentPath);
      if (parent) parent.children.push(node);
    }
    if (entry.isDirectory) dirMap.set(entry.path, node);
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) if (n.isDirectory) sortNodes(n.children);
  };
  sortNodes(root);
  return root;
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isSelected = selectedPath === node.fullPath;

  if (node.isDirectory) {
    return (
      <>
        <button
          className={`w-full text-left flex items-center gap-1.5 py-1 px-1 text-xs hover:bg-muted/50 ${
            isSelected ? 'bg-muted font-medium' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <FolderOpen className="h-3.5 w-3.5 text-amber-500" /> : <Folder className="h-3.5 w-3.5 text-amber-500" />}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children.map((child) => (
          <TreeItem key={child.fullPath} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
      </>
    );
  }

  return (
    <button
      className={`w-full text-left flex items-center gap-1.5 py-1 px-1 text-xs hover:bg-muted/50 ${
        isSelected ? 'bg-muted font-medium' : ''
      }`}
      style={{ paddingLeft: `${depth * 16 + 4}px` }}
      onClick={() => onSelect(node.fullPath)}
    >
      <File className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { detailQuery, completeMutation, deleteMutation, treeQuery, pushMutation } = useWorkspaceDetail(id);

  const [viewMode, setViewMode] = useState<ViewMode>('files');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedGitId, setSelectedGitId] = useState<string | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [pushConfirmOpen, setPushConfirmOpen] = useState(false);
  const [pushResultOpen, setPushResultOpen] = useState(false);

  const fileContentQuery = useWorkspaceFile(id, selectedFile ?? '');

  const workspace = detailQuery.data;

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }
  if (!workspace) {
    return <div className="p-4 text-sm text-muted-foreground">워크스페이스를 찾을 수 없습니다.</div>;
  }

  const isActive = workspace.status === 'ACTIVE';
  const treeNodes = buildTree(treeQuery.data ?? []);

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => navigate('/workspaces'),
    });
  };

  const handleComplete = () => {
    completeMutation.mutate(undefined, {
      onSuccess: () => setCompleteOpen(false),
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="shrink-0">
        <PageHeader title={workspace.name}>
          <div className="flex items-center gap-2">
            <StatusBadge status={workspace.status} type="workspace" />
            {isActive && (
              <Button variant="outline" size="sm" onClick={() => setCompleteOpen(true)}>
                <CheckCircle className="h-4 w-4 mr-1" />완료
              </Button>
            )}
            {workspace.status === 'COMPLETED' && (
              <Button
                size="sm"
                onClick={() => setPushConfirmOpen(true)}
                disabled={pushMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-1" />원격 푸시
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
            <span key={g.gitId}>
              {g.branchName} ({g.baseBranch})
            </span>
          ))}
        </div>

        {/* View mode tabs */}
        <div className="flex gap-1 px-1 pb-2">
          <Button
            variant={viewMode === 'files' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('files')}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />파일 탐색
          </Button>
          <Button
            variant={viewMode === 'diff' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('diff')}
          >
            <GitCompare className="h-3.5 w-3.5 mr-1" />Diff 뷰
          </Button>
          {viewMode === 'diff' && workspace.gitRefs.length > 1 && (
            <Select
              value={selectedGitId ?? workspace.gitRefs[0]?.gitId}
              onValueChange={setSelectedGitId}
            >
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workspace.gitRefs.map((g) => (
                  <SelectItem key={g.gitId} value={g.gitId}>
                    {g.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div className="flex-1 flex min-w-0">
          {viewMode === 'files' ? (
            <div className="flex w-full">
              {/* File tree */}
              <div className="w-56 border-r overflow-y-auto bg-muted/20">
                {treeQuery.isLoading ? (
                  <div className="p-4"><LoadingSpinner /></div>
                ) : treeNodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">파일 없음</p>
                ) : (
                  treeNodes.map((node) => (
                    <TreeItem
                      key={node.fullPath}
                      node={node}
                      depth={0}
                      selectedPath={selectedFile}
                      onSelect={setSelectedFile}
                    />
                  ))
                )}
              </div>
              {/* Editor */}
              <div className="flex-1">
                {selectedFile ? (
                  fileContentQuery.isLoading ? (
                    <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>
                  ) : fileContentQuery.data ? (
                    <Editor
                      value={fileContentQuery.data.content}
                      language={getLanguageFromPath(selectedFile)}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        fontSize: 13,
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      파일을 읽을 수 없습니다.
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    파일을 선택하세요.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <DiffViewerPanel workspaceId={id!} gitId={selectedGitId} />
          )}
        </div>

        {/* Right panel - Chat */}
        <div className="w-[400px] shrink-0">
          <ChatPanel workspaceId={id!} isActive={isActive} />
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="워크스페이스 완료"
        description="이 워크스페이스를 완료 처리하시겠습니까? 에이전트 세션이 종료됩니다."
        confirmLabel="완료"
        onConfirm={handleComplete}
        loading={completeMutation.isPending}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="워크스페이스 삭제"
        description="이 워크스페이스를 삭제하시겠습니까? 관련 브랜치와 워크트리가 모두 제거됩니다."
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={pushConfirmOpen}
        onOpenChange={setPushConfirmOpen}
        title="원격 푸시"
        description="로컬 브랜치를 원격 저장소로 푸시합니다. 계속하시겠습니까?"
        confirmLabel="푸시"
        onConfirm={() => {
          pushMutation.mutate(undefined, {
            onSuccess: () => {
              setPushConfirmOpen(false);
              setPushResultOpen(true);
            },
          });
        }}
        loading={pushMutation.isPending}
      />
      <PushResultDialog
        open={pushResultOpen}
        onClose={() => setPushResultOpen(false)}
        results={pushMutation.data?.results ?? null}
      />
    </div>
  );
}
