import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { PushResult } from '@/api/types';

interface PushResultDialogProps {
  open: boolean;
  onClose: () => void;
  results: PushResult[] | null;
}

export function PushResultDialog({ open, onClose, results }: PushResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>원격 푸시 결과</DialogTitle>
        </DialogHeader>
        {results && results.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-3 py-2 font-medium">프로젝트</th>
                  <th className="px-3 py-2 font-medium">브랜치</th>
                  <th className="px-3 py-2 font-medium">결과</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs truncate max-w-[120px]">{r.gitId}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.branch}</td>
                    <td className="px-3 py-2">
                      {r.success ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          성공
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-xs">
                          <XCircle className="h-3.5 w-3.5" />
                          {r.error ?? '실패'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">푸시할 브랜치가 없습니다.</p>
        )}
        <DialogFooter>
          <Button onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
