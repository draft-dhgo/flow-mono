import type { ApiError } from '@/api/types';
import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  error: ApiError | Error | null;
}

export function ErrorAlert({ error }: ErrorAlertProps) {
  if (!error) return null;

  const message = 'message' in error ? error.message : '알 수 없는 오류가 발생했습니다.';

  return (
    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
