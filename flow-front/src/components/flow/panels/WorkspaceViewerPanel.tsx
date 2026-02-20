import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import { workflowRunsApi } from '@/api/workflow-runs';
import { queryKeys } from '@/lib/query-keys';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { File, Folder, FolderOpen, X } from 'lucide-react';
import type { FileTreeEntry } from '@/api/types';

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.includes('.') ? '.' + filePath.split('.').pop() : '';
  const map: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.json': 'json',
    '.md': 'markdown',
    '.css': 'css',
    '.html': 'html',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.py': 'python',
    '.sh': 'shell',
    '.sql': 'sql',
    '.xml': 'xml',
    '.toml': 'toml',
    '.env': 'plaintext',
    '.gitignore': 'plaintext',
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

  for (const entry of entries) {
    const parts = entry.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existing = current.find((n) => n.name === part);

      if (existing) {
        current = existing.children;
      } else {
        const node: TreeNode = {
          name: part,
          fullPath: isLast ? entry.path : parts.slice(0, i + 1).join('/'),
          isDirectory: isLast ? entry.isDirectory : true,
          children: [],
        };
        current.push(node);
        current = node.children;
      }
    }
  }

  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map((n) => ({ ...n, children: sortNodes(n.children) }));
  }

  return sortNodes(root);
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
  const [expanded, setExpanded] = useState(depth === 0);

  if (node.isDirectory) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1 w-full text-left text-sm py-0.5 hover:bg-accent rounded px-1"
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
        >
          {expanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded &&
          node.children.map((child) => (
            <TreeItem
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.fullPath)}
      className={`flex items-center gap-1 w-full text-left text-sm py-0.5 rounded px-1 ${
        selectedPath === node.fullPath ? 'bg-accent' : 'hover:bg-accent/50'
      }`}
      style={{ paddingLeft: `${depth * 16 + 4}px` }}
    >
      <File className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

interface WorkspaceViewerPanelProps {
  runId: string;
  onClose: () => void;
}

export function WorkspaceViewerPanel({ runId, onClose }: WorkspaceViewerPanelProps) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const treeQuery = useQuery({
    queryKey: queryKeys.workflowRuns.workspaceTree(runId),
    queryFn: () => workflowRunsApi.getWorkspaceTree(runId),
  });

  const fileContentQuery = useQuery({
    queryKey: queryKeys.workflowRuns.workspaceFile(runId, selectedFilePath ?? ''),
    queryFn: () => workflowRunsApi.getWorkspaceFile(runId, selectedFilePath!),
    enabled: selectedFilePath !== null,
  });

  const treeNodes = treeQuery.data ? buildTree(treeQuery.data) : [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-sm shrink-0">워크스페이스 탐색</h3>
          {selectedFilePath && (
            <span className="text-xs text-muted-foreground font-mono truncate">
              {selectedFilePath}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r overflow-y-auto bg-white shrink-0 py-1">
          {treeQuery.isLoading && (
            <div className="p-4">
              <LoadingSpinner />
            </div>
          )}
          {treeQuery.isError && (
            <p className="p-4 text-sm text-red-500">파일 트리를 불러올 수 없습니다</p>
          )}
          {treeNodes.map((node) => (
            <TreeItem
              key={node.fullPath}
              node={node}
              depth={0}
              selectedPath={selectedFilePath}
              onSelect={setSelectedFilePath}
            />
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {!selectedFilePath && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              파일을 선택하세요
            </div>
          )}
          {selectedFilePath && fileContentQuery.isLoading && (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          )}
          {selectedFilePath && fileContentQuery.isError && (
            <div className="flex items-center justify-center h-full text-sm text-red-500">
              파일을 불러올 수 없습니다
            </div>
          )}
          {selectedFilePath && fileContentQuery.data && (
            <Editor
              height="100%"
              language={getLanguageFromPath(selectedFilePath)}
              value={fileContentQuery.data.content}
              theme="vs-light"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                wordWrap: 'on',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
