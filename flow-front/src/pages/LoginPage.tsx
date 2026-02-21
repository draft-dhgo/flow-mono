import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ErrorAlert } from '@/components/ErrorAlert';
import { Loader2 } from 'lucide-react';
import type { ApiError } from '@/api/types';

// ── 유효성 검증 스키마 ──

const loginSchema = z.object({
  username: z.string().min(1, '사용자 ID는 필수입니다'),
  password: z.string().min(1, '비밀번호는 필수입니다'),
});

const registerSchema = z.object({
  username: z.string().min(3, '사용자 ID는 3자 이상이어야 합니다'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  displayName: z.string().min(1, '표시 이름은 필수입니다'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export function LoginPage() {
  const { login, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<ApiError | Error | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', displayName: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setApiError(null);
    try {
      await login(data);
      navigate('/', { replace: true });
    } catch (err) {
      setApiError(err as ApiError);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      await registerUser(data);
      navigate('/', { replace: true });
    } catch (err) {
      setApiError(err as ApiError);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">FlowFlow</CardTitle>
          <CardDescription>워크플로우 기반 AI 에이전트 관리 플랫폼</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" onValueChange={() => setApiError(null)}>
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">
                로그인
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1">
                회원가입
              </TabsTrigger>
            </TabsList>

            {/* ── 로그인 탭 ── */}
            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label htmlFor="login-username" className="text-sm font-medium">
                    사용자 ID
                  </label>
                  <Input
                    id="login-username"
                    placeholder="admin"
                    {...loginForm.register('username')}
                    aria-invalid={!!loginForm.formState.errors.username}
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="login-password" className="text-sm font-medium">
                    비밀번호
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    {...loginForm.register('password')}
                    aria-invalid={!!loginForm.formState.errors.password}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <ErrorAlert error={apiError} />
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  로그인
                </Button>
              </form>
            </TabsContent>

            {/* ── 회원가입 탭 ── */}
            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label htmlFor="reg-username" className="text-sm font-medium">
                    사용자 ID
                  </label>
                  <Input
                    id="reg-username"
                    placeholder="user1"
                    {...registerForm.register('username')}
                    aria-invalid={!!registerForm.formState.errors.username}
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-password" className="text-sm font-medium">
                    비밀번호
                  </label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="6자 이상"
                    {...registerForm.register('password')}
                    aria-invalid={!!registerForm.formState.errors.password}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-displayName" className="text-sm font-medium">
                    표시 이름
                  </label>
                  <Input
                    id="reg-displayName"
                    placeholder="홍길동"
                    {...registerForm.register('displayName')}
                    aria-invalid={!!registerForm.formState.errors.displayName}
                  />
                  {registerForm.formState.errors.displayName && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.displayName.message}</p>
                  )}
                </div>
                <ErrorAlert error={apiError} />
                <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  회원가입
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
