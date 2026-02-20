import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          문제가 발생했습니다
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          {error.message}
        </p>
        <div className="flex gap-3">
          <Button onClick={resetErrorBoundary}>
            다시 시도
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetErrorBoundary();
              navigate('/');
            }}
          >
            홈으로 이동
          </Button>
        </div>
      </div>
    </div>
  );
}
