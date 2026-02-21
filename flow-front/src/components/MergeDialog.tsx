import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useWorkspaceList } from '@/hooks/useWorkspaces';

interface MergeDialogProps {
  open: boolean;
  onClose: () => void;
  selectedRunIds: string[];
  onMerge: (workspaceId: string) => void;
  loading?: boolean;
}

export function MergeDialog({ open, onClose, selectedRunIds, onMerge, loading = false }: MergeDialogProps) {
  const { listQuery } = useWorkspaceList();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

  const activeWorkspaces = (listQuery.data ?? []).filter((w) => w.status === 'ACTIVE');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>브랜치 통합</DialogTitle>
          <DialogDescription>
            선택한 워크플로우의 브랜치를 워크스페이스로 머지합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              {selectedRunIds.length}개의 워크플로우 런이 선택되었습니다.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">대상 워크스페이스</label>
            {listQuery.isLoading ? (
              <LoadingSpinner />
            ) : activeWorkspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                활성 상태의 워크스페이스가 없습니다. 먼저 워크스페이스를 생성하세요.
              </p>
            ) : (
              <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="워크스페이스를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {activeWorkspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={() => onMerge(selectedWorkspaceId)}
            disabled={!selectedWorkspaceId || loading}
          >
            {loading ? '처리 중...' : '통합'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
