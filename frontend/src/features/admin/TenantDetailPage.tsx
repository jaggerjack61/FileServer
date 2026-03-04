import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StorageBar } from '@/components/ui/StorageBar';
import { Modal } from '@/components/ui/Modal';
import { formatFileSize, formatRelativeDate } from '@/lib/utils';
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';

const QUOTA_OPTIONS = [
  { label: '100 MB', value: 100 * 1024 * 1024 },
  { label: '500 MB', value: 500 * 1024 * 1024 },
  { label: '1 GB', value: 1024 * 1024 * 1024 },
  { label: '5 GB', value: 5 * 1024 * 1024 * 1024 },
  { label: '10 GB', value: 10 * 1024 * 1024 * 1024 },
  { label: '50 GB', value: 50 * 1024 * 1024 * 1024 },
];

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [customQuota, setCustomQuota] = useState('');

  const tenantQuery = useQuery({
    queryKey: ['admin', 'tenant', id],
    queryFn: () => adminService.getTenant(id!),
    enabled: !!id,
  });

  const apiKeysQuery = useQuery({
    queryKey: ['admin', 'tenant', id, 'api-keys'],
    queryFn: () => adminService.getTenantApiKeys(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Parameters<typeof adminService.updateTenant>[1]) =>
      adminService.updateTenant(id!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      setShowQuotaModal(false);
      setShowToggleModal(false);
    },
  });

  if (tenantQuery.isLoading) {
    return <Spinner className="py-20" size="lg" />;
  }

  if (tenantQuery.isError || !tenantQuery.data) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 font-medium">Tenant not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/admin/tenants')}>
          Back to Tenants
        </Button>
      </div>
    );
  }

  const tenant = tenantQuery.data;
  const apiKeys = apiKeysQuery.data?.results ?? [];

  const handleQuotaUpdate = (quotaBytes: number) => {
    updateMutation.mutate({ storage_quota: quotaBytes });
  };

  const handleToggleActive = () => {
    updateMutation.mutate({ is_active: !tenant.is_active });
  };

  const stats = [
    { label: 'Members', value: tenant.member_count ?? 0, icon: UserGroupIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Files', value: tenant.file_count ?? 0, icon: DocumentIcon, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Storage Used', value: formatFileSize(tenant.storage_used), icon: CircleStackIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'API Keys', value: apiKeys.length, icon: ShieldCheckIcon, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/tenants')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            <Badge variant={tenant.is_active ? 'success' : 'danger'}>
              {tenant.is_active ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-mono">{tenant.slug}</span> &middot; Created {formatRelativeDate(tenant.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowQuotaModal(true)}>
            Edit Quota
          </Button>
          <Button
            variant={tenant.is_active ? 'danger' : 'primary'}
            onClick={() => setShowToggleModal(true)}
          >
            {tenant.is_active ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Storage */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage</h2>
        <StorageBar used={tenant.storage_used} quota={tenant.storage_quota} />
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
          <span>Quota: {formatFileSize(tenant.storage_quota)}</span>
          <Button variant="ghost" size="sm" onClick={() => setShowQuotaModal(true)}>Change</Button>
        </div>
      </Card>

      {/* Owner & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Owner</dt>
              <dd className="text-sm font-medium text-gray-900">{tenant.owner_email ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Slug</dt>
              <dd className="text-sm font-mono text-gray-900">{tenant.slug}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">{new Date(tenant.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Updated</dt>
              <dd className="text-sm text-gray-900">{new Date(tenant.updated_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>

        {/* API Keys */}
        <Card padding={false}>
          <div className="p-6 pb-3">
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          </div>
          {apiKeysQuery.isLoading ? (
            <Spinner className="py-8" />
          ) : apiKeys.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-gray-400">No API keys created.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prefix</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {apiKeys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{key.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 font-mono">{key.prefix}...</td>
                      <td className="px-6 py-3">
                        <Badge variant={key.revoked ? 'danger' : 'success'}>
                          {key.revoked ? 'Revoked' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{formatRelativeDate(key.created)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Quota Modal */}
      <Modal open={showQuotaModal} onClose={() => setShowQuotaModal(false)} title="Update Storage Quota" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Current: <span className="font-medium text-gray-900">{formatFileSize(tenant.storage_quota)}</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUOTA_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleQuotaUpdate(option.value)}
                disabled={updateMutation.isPending}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  tenant.storage_quota === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="pt-2 border-t">
            <label className="text-xs text-gray-500 block mb-1">Custom (in MB)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={customQuota}
                onChange={e => setCustomQuota(e.target.value)}
                placeholder="e.g. 2048"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Button
                size="sm"
                disabled={!customQuota || updateMutation.isPending}
                loading={updateMutation.isPending}
                onClick={() => handleQuotaUpdate(Number(customQuota) * 1024 * 1024)}
              >
                Set
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Toggle Active Modal */}
      <Modal open={showToggleModal} onClose={() => setShowToggleModal(false)} title={tenant.is_active ? 'Disable Tenant' : 'Enable Tenant'} size="sm">
        <p className="text-sm text-gray-600 mb-4">
          {tenant.is_active
            ? `Disabling "${tenant.name}" will prevent all users from accessing files and uploading. This action can be reversed.`
            : `Enabling "${tenant.name}" will restore access for all users.`
          }
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowToggleModal(false)}>Cancel</Button>
          <Button
            variant={tenant.is_active ? 'danger' : 'primary'}
            onClick={handleToggleActive}
            loading={updateMutation.isPending}
          >
            {tenant.is_active ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
