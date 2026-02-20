import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface IssueKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (issueKey: string, seedValues: Record<string, string>) => void;
  loading?: boolean;
  branchStrategy?: string;
  defaultIssueKey?: string;
  seedKeys?: string[];
  defaultSeedValues?: Record<string, string>;
}

const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

function IssueKeyForm({
  onConfirm,
  onCancel,
  loading,
  branchStrategy,
  defaultIssueKey,
  seedKeys,
  defaultSeedValues,
}: {
  onConfirm: (issueKey: string, seedValues: Record<string, string>) => void;
  onCancel: () => void;
  loading: boolean;
  branchStrategy?: string;
  defaultIssueKey: string;
  seedKeys?: string[];
  defaultSeedValues?: Record<string, string>;
}) {
  const [issueKey, setIssueKey] = useState(defaultIssueKey);
  const [seedValues, setSeedValues] = useState<Record<string, string>>(
    defaultSeedValues ?? {},
  );

  const isValid = ISSUE_KEY_PATTERN.test(issueKey.trim());
  const branchPreview =
    branchStrategy && isValid
      ? branchStrategy.replace('{issueKey}', issueKey.trim())
      : null;

  const isSeedValid =
    !seedKeys || seedKeys.length === 0 ||
    seedKeys.every((key) => seedValues[key]?.trim());

  return (
    <>
      <div className="space-y-3 py-2">
        <div>
          <label className="text-sm font-medium">이슈 키 *</label>
          <Input
            value={issueKey}
            onChange={(e) => setIssueKey(e.target.value)}
            placeholder="PROJ-123"
            autoFocus
          />
          {issueKey.trim() && !isValid && (
            <p className="text-sm text-red-500 mt-1">
              이슈 키 형식: PROJ-123
            </p>
          )}
        </div>

        {branchPreview && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              브랜치명 미리보기
            </label>
            <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {branchPreview}
            </p>
          </div>
        )}

        {seedKeys && seedKeys.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">시드 값</label>
            {seedKeys.map((key) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground">{key} *</label>
                <Input
                  value={seedValues[key] ?? ''}
                  onChange={(e) =>
                    setSeedValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={`{seed:${key}} 값 입력`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button
          onClick={() => onConfirm(issueKey.trim(), seedValues)}
          disabled={!isValid || !isSeedValid || loading}
        >
          {loading ? '실행 중...' : '실행'}
        </Button>
      </DialogFooter>
    </>
  );
}

export function IssueKeyDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  branchStrategy,
  defaultIssueKey = '',
  seedKeys,
  defaultSeedValues,
}: IssueKeyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>워크플로우 실행</DialogTitle>
          <DialogDescription>이슈 키를 입력하세요.</DialogDescription>
        </DialogHeader>

        {open && (
          <IssueKeyForm
            onConfirm={onConfirm}
            onCancel={() => onOpenChange(false)}
            loading={loading}
            branchStrategy={branchStrategy}
            defaultIssueKey={defaultIssueKey}
            seedKeys={seedKeys}
            defaultSeedValues={defaultSeedValues}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
