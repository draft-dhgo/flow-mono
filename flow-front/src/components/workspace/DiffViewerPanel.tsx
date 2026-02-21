import { useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useWorkspaceDiff } from '@/hooks/useWorkspaces';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { File } from 'lucide-react';

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.includes('.') ? '.' + filePath.split('.').pop() : '';
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
    '.json': 'json', '.md': 'markdown',
    '.css': 'css', '.html': 'html',
    '.yaml': 'yaml', '.yml': 'yaml',
    '.py': 'python', '.sh': 'shell',
    '.sql': 'sql', '.xml': 'xml',
  };
  return map[ext] ?? 'plaintext';
}

interface DiffViewerPanelProps {
  workspaceId: string;
  gitId?: string;
}

export function DiffViewerPanel({ workspaceId, gitId }: DiffViewerPanelProps) {
  const diffQuery = useWorkspaceDiff(workspaceId, gitId);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const files = diffQuery.data ?? [];
  const selected = selectedIndex !== null ? files[selectedIndex] : null;

  if (diffQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File list */}
      <div className="w-56 border-r overflow-y-auto bg-muted/20">
        <div className="p-2 border-b text-xs font-medium text-muted-foreground">
          변경 파일 ({files.length})
        </div>
        {files.length === 0 && (
          <p className="text-xs text-muted-foreground p-3 text-center">변경 사항 없음</p>
        )}
        {files.map((file, idx) => (
          <button
            key={file.path}
            className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-1.5 hover:bg-muted/50 ${
              selectedIndex === idx ? 'bg-muted font-medium' : ''
            }`}
            onClick={() => setSelectedIndex(idx)}
          >
            <File className="h-3 w-3 shrink-0" />
            <span className="truncate">{file.path}</span>
          </button>
        ))}
      </div>

      {/* Diff editor */}
      <div className="flex-1">
        {selected ? (
          <DiffEditor
            original={selected.original}
            modified={selected.modified}
            language={getLanguageFromPath(selected.path)}
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: 'on',
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            좌측에서 파일을 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
}
