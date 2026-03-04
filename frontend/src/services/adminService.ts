import api from '@/lib/axios';
import type { TenantAdmin, StorageMetrics, SystemMetrics, ActivityLogEntry, ApiKey, PaginatedResponse } from '@/types';

export const adminService = {
  listTenants: async (): Promise<TenantAdmin[]> => {
    const { data } = await api.get<TenantAdmin[]>('/admin/tenants/');
    return data;
  },

  getTenant: async (id: string): Promise<TenantAdmin> => {
    const { data } = await api.get<TenantAdmin>(`/admin/tenants/${id}/`);
    return data;
  },

  updateTenant: async (id: string, updates: Partial<{
    is_active: boolean;
    storage_quota: number;
    name: string;
  }>): Promise<TenantAdmin> => {
    const { data } = await api.patch<TenantAdmin>(`/admin/tenants/${id}/`, updates);
    return data;
  },

  getTenantApiKeys: async (tenantId: string): Promise<PaginatedResponse<ApiKey>> => {
    const { data } = await api.get<PaginatedResponse<ApiKey>>(`/admin/tenants/${tenantId}/api-keys/`);
    return data;
  },

  getStorageUsage: async (): Promise<StorageMetrics> => {
    const { data } = await api.get<StorageMetrics>('/admin/storage-usage/');
    return data;
  },

  getSystemMetrics: async (): Promise<SystemMetrics> => {
    const { data } = await api.get<SystemMetrics>('/admin/system-metrics/');
    return data;
  },

  getActivityLog: async (): Promise<{ count: number; results: ActivityLogEntry[] }> => {
    const { data } = await api.get<{ count: number; results: ActivityLogEntry[] }>('/admin/activity/');
    return data;
  },
};
