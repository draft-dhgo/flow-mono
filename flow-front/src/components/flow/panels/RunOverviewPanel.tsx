import { useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { WorkflowRunDetailResponse, CheckpointResponse } from '@/api/types';
import { Pause, Play, Square, RotateCcw, Trash2, History, Loader2, FastForward } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface RunOverviewPanelProps {
  runDetail: WorkflowRunDetailResponse;
  onPause: () => void;
  onResume: (checkpointId?: string) => void;
  onCancel: (reason?: string) => void;
  onDelete: () => void;
  onRerun: () => void;
  isPausePending: boolean;
  isResumePending: boolean;
  isCancelPending: boolean;
  isDeletePending: boolean;
  isRerunPending: boolean;
  checkpoints?: CheckpointResponse[];
  onRestore?: (checkpointId: string) => void;
  isRestorePending?: boolean;
  autoResume: boolean;
  onAutoResumeChange: (value: boolean) => void;
}

export function RunOverviewPanel({
  runDetail,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onRerun,
  isPausePending,
  isResumePending,
  isCancelPending,
  isDeletePending,
  isRerunPending,
  checkpoints,
  onRestore,
  isRestorePending,
  autoResume,
  onAutoResumeChange,
}: RunOverviewPanelProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const status = runDetail.status;
  const isRunning = status === 'RUNNING';
  const progress = Math.min(runDetail.currentWorkIndex + 1, runDetail.totalWorkCount);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">실행 개요</h3>
        <StatusBadge status={status} />
      </div>

      <div>
        <p className="text-sm text-muted-foreground">이슈 키</p>
        <p className="text-sm font-medium">{runDetail.issueKey}</p>
      </div>

      {runDetail.seedValues && Object.keys(runDetail.seedValues).length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground">시드 값</p>
          {Object.entries(runDetail.seedValues).map(([key, value]) => (
            <p key={key} className="text-sm">
              <span className="font-mono text-muted-foreground">{key}</span>: {value}
            </p>
          ))}
        </div>
      )}

      <div>
        <p className="text-sm text-muted-foreground">진행률</p>
        <p className="text-lg font-semibold">
          Work {progress}/{runDetail.totalWorkCount}
        </p>
        <div className="w-full bg-muted rounded-full h-2 mt-1">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${(progress / runDetail.totalWorkCount) * 100}%` }}
          />
        </div>
      </div>

      {runDetail.cancellationReason && (
        <div className="text-sm text-red-600">
          <span className="font-medium">취소 사유:</span> {runDetail.cancellationReason}
        </div>
      )}

      <div className="space-y-2">
        {status === 'INITIALIZED' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            실행 준비 중...
          </div>
        )}
        {isRunning && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onPause}
              disabled={isPausePending}
            >
              <Pause className="mr-1 h-4 w-4" />
              일시정지
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowCancelDialog(true)}
            >
              <Square className="mr-1 h-4 w-4" />
              취소
            </Button>
          </>
        )}
        {status === 'PAUSED' && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onResume(undefined)}
              disabled={isResumePending}
            >
              <Play className="mr-1 h-4 w-4" />
              재개
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowCancelDialog(true)}
            >
              <Square className="mr-1 h-4 w-4" />
              취소
            </Button>
          </>
        )}
        {status === 'AWAITING' && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onResume(undefined)}
              disabled={isResumePending}
            >
              <Play className="mr-1 h-4 w-4" />
              계속
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowCancelDialog(true)}
            >
              <Square className="mr-1 h-4 w-4" />
              취소
            </Button>
          </>
        )}
        {status === 'COMPLETED' && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onRerun}
              disabled={isRerunPending}
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              재실행
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={onDelete}
              disabled={isDeletePending}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              삭제
            </Button>
          </>
        )}
        {status === 'CANCELLED' && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onRerun}
              disabled={isRerunPending}
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              재실행
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={onDelete}
              disabled={isDeletePending}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              삭제
            </Button>
          </>
        )}
      </div>

      {(status === 'PAUSED' || status === 'AWAITING') &&
        checkpoints &&
        checkpoints.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <History className="h-4 w-4" /> 체크포인트 복원
            </p>
            {checkpoints.map((cp) => (
              <div key={cp.id} className="flex items-center justify-between py-1 text-sm">
                <span>Work #{cp.workSequence + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRestore?.(cp.id)}
                  disabled={isRestorePending}
                >
                  이 지점으로 복원
                </Button>
              </div>
            ))}
          </div>
        )}

      {(status === 'RUNNING' || status === 'AWAITING') && (
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="auto-resume"
              checked={autoResume}
              onCheckedChange={(checked) => onAutoResumeChange(checked === true)}
            />
            <label htmlFor="auto-resume" className="text-sm font-medium flex items-center gap-1">
              <FastForward className="h-4 w-4" />
              자동 진행
            </label>
          </div>
          {autoResume && (
            <p className="text-xs text-muted-foreground mt-1">
              워크 완료 후 일시정지 없이 다음 워크로 자동 진행합니다
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="실행 취소"
        description="정말 취소하시겠습니까?"
        confirmLabel="취소 실행"
        destructive
        onConfirm={() => {
          onCancel(cancelReason || undefined);
          setShowCancelDialog(false);
          setCancelReason('');
        }}
        loading={isCancelPending}
      >
        <div className="py-2">
          <label className="text-sm font-medium">취소 사유 (선택)</label>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
