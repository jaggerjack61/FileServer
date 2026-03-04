import api from '@/lib/axios';
import type { ApiKey, ApiKeyCreateResponse, PaginatedResponse } from '@/types';

export const apiKeyService = {
  list: async (): Promise<PaginatedResponse<ApiKey>> => {
    const { data } = await api.get<PaginatedResponse<ApiKey>>('/apikeys/');
    return data;
  },

  create: async (name: string, permissions: string[]): Promise<ApiKeyCreateResponse> => {
    const { data } = await api.post<ApiKeyCreateResponse>('/apikeys/', { name, permissions });
    return data;
  },

  revoke: async (prefix: string): Promise<void> => {
    await api.delete(`/apikeys/${prefix}/`);
  },
};
