import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fileService } from '@/services/fileService';

interface UseFilesOptions {
  folderId?: string | null;
  search?: string;
  ordering?: string;
}

export function useFiles(options: UseFilesOptions = {}) {
  const { folderId, search, ordering } = options;

  return useQuery({
    queryKey: ['files', { folderId, search, ordering }],
    queryFn: () =>
      fileService.list({
        folder_id: folderId,
        search,
        ordering,
      }),
  });
}

export function useFile(id: string) {
  return useQuery({
    queryKey: ['file', id],
    queryFn: () => fileService.get(id),
    enabled: !!id,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string | null }) =>
      fileService.upload(file, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fileService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      fileService.rename(id, filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      fileService.move(id, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

// Trash hooks
export function useTrashFiles(search?: string) {
  return useQuery({
    queryKey: ['trash', { search }],
    queryFn: () => fileService.listTrash({ search }),
  });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fileService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

// Bulk hooks
export function useBulkDeleteFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileIds: string[]) => fileService.bulkDelete(fileIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useBulkMoveFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileIds, folderId }: { fileIds: string[]; folderId: string | null }) =>
      fileService.bulkMove(fileIds, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}
