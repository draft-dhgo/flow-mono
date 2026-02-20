import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import type { CheckpointResponse } from '@/api/types';
import { formatDate } from '@/lib/format';
import { useState } from 'react';

interface CheckpointPanelProps {
  checkpoints: CheckpointResponse[];
  onRestore: (checkpointId: string) => void;
  isRestorePending: boolean;
}

export function CheckpointPanel({ checkpoints, onRestore, isRestorePending }: CheckpointPanelProps) {
  const [restoreId, setRestoreId] = useState<string | null>(null);

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold text-sm">체크포인트</h3>
      {checkpoints.length === 0 ? (
        <p className="text-sm text-muted-foreground">체크포인트가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {checkpoints.map((cp, i) => (
            <div key={cp.id} className="flex items-center justify-between border rounded p-2 text-sm">
              <div>
                <span className="font-medium">#{i + 1}</span>
                <span className="text-muted-foreground ml-2">
                  Work {cp.workSequence + 1}
                </span>
                <span className="text-muted-foreground ml-2">
                  {formatDate(cp.createdAt)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestoreId(cp.id)}
              >
                이 지점으로 복원
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!restoreId}
        onOpenChange={(open) => !open && setRestoreId(null)}
        title="체크포인트 복원"
        description="체크포인트로 복원합니다. 복원 후 노드 구성을 수정한 뒤 재개할 수 있습니다."
        confirmLabel="복원"
        onConfirm={() => {
          if (restoreId) {
            onRestore(restoreId);
            setRestoreId(null);
          }
        }}
        loading={isRestorePending}
      />
    </div>
  );
}
