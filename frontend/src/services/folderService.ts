import api from '@/lib/axios';
import type { Folder, PaginatedResponse } from '@/types';

interface FolderListParams {
  parent?: string | null;
  search?: string;
}

export const folderService = {
  list: async (params: FolderListParams = {}): Promise<PaginatedResponse<Folder>> => {
    const queryParams: Record<string, string> = {};
    if (params.parent) queryParams.parent = params.parent;
    if (params.search) queryParams.search = params.search;
    const { data } = await api.get<PaginatedResponse<Folder>>('/folders/', { params: queryParams });
    return data;
  },

  get: async (id: string): Promise<Folder> => {
    const { data } = await api.get<Folder>(`/folders/${id}/`);
    return data;
  },

  create: async (name: string, parent?: string | null): Promise<Folder> => {
    const body: { name: string; parent?: string } = { name };
    if (parent) {
      body.parent = parent;
    }
    const { data } = await api.post<Folder>('/folders/', body);
    return data;
  },

  update: async (id: string, name: string): Promise<Folder> => {
    const { data } = await api.put<Folder>(`/folders/${id}/`, { name });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/folders/${id}/`);
  },
};
