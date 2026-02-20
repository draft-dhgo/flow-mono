import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { GitRefPanel } from './GitRefPanel';
import { McpRefPanel } from './McpRefPanel';
import { X } from 'lucide-react';

interface WorkflowInfoPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  isEdit: boolean;
  gits: { id: string; url: string }[];
  mcpServers: { id: string; name: string }[];
}

export function WorkflowInfoPanel({ form, isEdit, gits, mcpServers }: WorkflowInfoPanelProps) {
  const [newSeedKey, setNewSeedKey] = useState('');
  const seedKeys: string[] = form.watch('seedKeys') ?? [];

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-sm">워크플로우 정보</h3>

      <div>
        <label className="text-sm font-medium">이름 *</label>
        <Input {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500 mt-1">
            {(form.formState.errors.name as { message?: string })?.message}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">설명</label>
        <Textarea {...form.register('description')} rows={2} />
      </div>

      <div>
        <label className="text-sm font-medium">브랜치 전략 *</label>
        <Input
          {...form.register('branchStrategy')}
          placeholder="feature/{issueKey}"
          disabled={isEdit}
        />
        {form.formState.errors.branchStrategy && (
          <p className="text-sm text-red-500 mt-1">
            {(form.formState.errors.branchStrategy as { message?: string })?.message}
          </p>
        )}
      </div>

      <GitRefPanel form={form} fieldPath="gitRefs" gits={gits} />
      <McpRefPanel form={form} fieldPath="mcpServerRefs" mcpServers={mcpServers} />

      <div>
        <label className="text-sm font-medium">시드 변수</label>
        <p className="text-xs text-muted-foreground mb-2">
          태스크 쿼리에서 {'{seed:키이름}'} 형식으로 사용할 변수 키를 정의합니다
        </p>

        {seedKeys.length > 0 && (
          <div className="space-y-1 mb-2">
            {seedKeys.map((key: string, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm bg-muted px-2 py-1 rounded">
                <span className="flex-1 font-mono">{key}</span>
                <button
                  type="button"
                  onClick={() => {
                    form.setValue(
                      'seedKeys',
                      seedKeys.filter((_: string, i: number) => i !== index),
                    );
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newSeedKey}
            onChange={(e) => setNewSeedKey(e.target.value)}
            placeholder="변수 키 입력"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newSeedKey.trim()) {
                  form.setValue('seedKeys', [...seedKeys, newSeedKey.trim()]);
                  setNewSeedKey('');
                }
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (newSeedKey.trim()) {
                form.setValue('seedKeys', [...seedKeys, newSeedKey.trim()]);
                setNewSeedKey('');
              }
            }}
          >
            추가
          </Button>
        </div>
      </div>
    </div>
  );
}
