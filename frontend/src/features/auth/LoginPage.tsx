import { useState, type FormEvent } from 'react';
import { useLogin } from '@/hooks/useAuth';
import { AuthShell } from '@/features/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AxiosError } from 'axios';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const errorMessage =
    loginMutation.error instanceof AxiosError
      ? loginMutation.error.response?.data?.detail || 'Invalid credentials. Please try again.'
      : loginMutation.error
        ? 'An unexpected error occurred.'
        : null;

  return (
    <AuthShell
      eyebrow="Access portal"
      title="Welcome back"
      description="Sign in to open your FileServer workspace, manage tenant files, and continue where you left off."
      footerPrompt="Don't have an account?"
      footerLinkLabel="Create one"
      footerHref="/register"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-rose-200">
            {errorMessage}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          variant="dark"
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          variant="dark"
          autoComplete="current-password"
          required
        />

        <Button
          type="submit"
          variant="brand"
          size="lg"
          pill
          className="w-full"
          loading={loginMutation.isPending}
        >
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
