import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import type { LoginPayload, RegisterPayload } from '@/types';

export function useCurrentUser() {
  const { accessToken } = useAuthStore();

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: authService.getMe,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (data) => {
      login(data.user, data.access, data.refresh);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate('/files');
    },
  });
}

export function useRegister() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: (data) => {
      login(data.user, data.access, data.refresh);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate('/files');
    },
  });
}

export function useLogout() {
  const { refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (refreshToken) {
        return authService.logout(refreshToken);
      }
      return Promise.resolve();
    },
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
}
