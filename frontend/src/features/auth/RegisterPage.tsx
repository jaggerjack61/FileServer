import { useState, type FormEvent } from 'react';
import { useRegister } from '@/hooks/useAuth';
import { AuthShell } from '@/features/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AxiosError } from 'axios';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const registerMutation = useRegister();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      email,
      username,
      password,
      tenant_name: tenantName,
    });
  };

  const getErrors = (): Record<string, string[]> => {
    if (registerMutation.error instanceof AxiosError) {
      return registerMutation.error.response?.data || {};
    }
    return {};
  };

  const errors = getErrors();
  const generalError =
    registerMutation.error instanceof AxiosError
      ? typeof registerMutation.error.response?.data === 'string'
        ? registerMutation.error.response.data
        : registerMutation.error.response?.data?.detail
      : registerMutation.error
        ? 'An unexpected error occurred.'
        : null;

  return (
    <AuthShell
      eyebrow="Create workspace"
      title="Create your account"
      description="Set up your tenant, invite your team later, and start managing files inside the same protected environment."
      footerPrompt="Already have an account?"
      footerLinkLabel="Sign in"
      footerHref="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {generalError && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-rose-200">
            {generalError}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email?.[0]}
          variant="dark"
          autoComplete="email"
          required
        />

        <Input
          label="Username"
          type="text"
          placeholder="johndoe"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username?.[0]}
          variant="dark"
          autoComplete="username"
          required
        />

        <Input
          label="Organization / Tenant"
          type="text"
          placeholder="My Company"
          value={tenantName}
          onChange={(e) => setTenantName(e.target.value)}
          error={errors.tenant_name?.[0]}
          variant="dark"
          autoComplete="organization"
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password?.[0]}
          variant="dark"
          autoComplete="new-password"
          required
        />

        <Button
          type="submit"
          variant="brand"
          size="lg"
          pill
          className="w-full"
          loading={registerMutation.isPending}
        >
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
