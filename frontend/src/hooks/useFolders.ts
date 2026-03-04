import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { folderService } from '@/services/folderService';

export function useFolders(parentId?: string | null) {
  return useQuery({
    queryKey: ['folders', { parentId }],
    queryFn: () => folderService.list({ parent: parentId }),
  });
}

export function useFolder(id: string) {
  return useQuery({
    queryKey: ['folder', id],
    queryFn: () => folderService.get(id),
    enabled: !!id,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, parent }: { name: string; parent?: string | null }) =>
      folderService.create(name, parent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      folderService.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => folderService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}
