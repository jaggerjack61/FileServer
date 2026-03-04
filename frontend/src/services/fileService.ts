import api from '@/lib/axios';
import type { FileItem, PaginatedResponse } from '@/types';

interface FileListParams {
  folder_id?: string | null;
  search?: string;
  ordering?: string;
  page?: number;
}

export const fileService = {
  list: async (params: FileListParams = {}): Promise<PaginatedResponse<FileItem>> => {
    const queryParams: Record<string, string | number> = {};
    if (params.folder_id) queryParams.folder_id = params.folder_id;
    if (params.search) queryParams.search = params.search;
    if (params.ordering) queryParams.ordering = params.ordering;
    if (params.page) queryParams.page = params.page;
    const { data } = await api.get<PaginatedResponse<FileItem>>('/files/', { params: queryParams });
    return data;
  },

  get: async (id: string): Promise<FileItem> => {
    const { data } = await api.get<FileItem>(`/files/${id}/`);
    return data;
  },

  upload: async (file: File, folderId?: string | null): Promise<FileItem> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId);
    }
    const { data } = await api.post<FileItem>('/files/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/files/${id}/`);
  },

  rename: async (id: string, filename: string): Promise<FileItem> => {
    const { data } = await api.put<FileItem>(`/files/${id}/rename/`, { filename });
    return data;
  },

  move: async (id: string, folderId: string | null): Promise<FileItem> => {
    const { data } = await api.put<FileItem>(`/files/${id}/move/`, { folder_id: folderId });
    return data;
  },

  download: async (id: string): Promise<Blob> => {
    const { data } = await api.get(`/files/${id}/download/`, {
      responseType: 'blob',
    });
    return data;
  },

  // Trash
  listTrash: async (params: { search?: string } = {}): Promise<PaginatedResponse<FileItem>> => {
    const queryParams: Record<string, string> = {};
    if (params.search) queryParams.search = params.search;
    const { data } = await api.get<PaginatedResponse<FileItem>>('/files/trash/', { params: queryParams });
    return data;
  },

  restore: async (id: string): Promise<FileItem> => {
    const { data } = await api.post<FileItem>(`/files/trash/${id}/restore/`);
    return data;
  },

  // Bulk operations
  bulkDelete: async (fileIds: string[]): Promise<{ deleted: number }> => {
    const { data } = await api.post<{ deleted: number }>('/files/bulk-delete/', { file_ids: fileIds });
    return data;
  },

  bulkMove: async (fileIds: string[], folderId: string | null): Promise<{ moved: number }> => {
    const { data } = await api.post<{ moved: number }>('/files/bulk-move/', {
      file_ids: fileIds,
      folder_id: folderId,
    });
    return data;
  },
};
