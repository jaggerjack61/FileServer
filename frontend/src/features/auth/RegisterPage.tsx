import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ServerStackIcon } from '@heroicons/react/24/outline';
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <ServerStackIcon className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="mt-1 text-sm text-gray-500">
            Get started with FileServer
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
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
              required
            />

            <Input
              label="Username"
              type="text"
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username?.[0]}
              required
            />

            <Input
              label="Organization / Tenant"
              type="text"
              placeholder="My Company"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              error={errors.tenant_name?.[0]}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password?.[0]}
              required
            />

            <Button
              type="submit"
              className="w-full"
              loading={registerMutation.isPending}
            >
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
