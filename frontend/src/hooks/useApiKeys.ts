import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeyService } from '@/services/apiKeyService';

export function useApiKeys() {
  return useQuery({
    queryKey: ['apiKeys'],
    queryFn: apiKeyService.list,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, permissions }: { name: string; permissions: string[] }) =>
      apiKeyService.create(name, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });
}
