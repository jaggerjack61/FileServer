import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ServerStackIcon } from '@heroicons/react/24/outline';
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <ServerStackIcon className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to your FileServer account
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              className="w-full"
              loading={loginMutation.isPending}
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
