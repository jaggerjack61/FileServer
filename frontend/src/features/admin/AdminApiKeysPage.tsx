import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { formatRelativeDate } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/errors';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

export function AdminApiKeysPage() {
  const tenantsQuery = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: adminService.listTenants,
  });

  const tenants = tenantsQuery.data ?? [];

  if (tenantsQuery.isLoading) {
    return <Spinner className="py-20" size="lg" />;
  }

  if (tenantsQuery.isError) {
    return (
      <Alert
        action={<Button variant="ghost" size="sm" onClick={() => tenantsQuery.refetch()}>Retry</Button>}
      >
        {getApiErrorMessage(tenantsQuery.error, 'Unable to load tenants.')}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Keys Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          View API keys across all tenants
        </p>
      </div>

      {tenants.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <ShieldCheckIcon className="h-12 w-12 mb-3" />
            <p className="text-sm">No tenants found.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {tenants.map(tenant => (
            <TenantApiKeysCard key={tenant.id} tenantId={tenant.id} tenantName={tenant.name} />
          ))}
        </div>
      )}
    </div>
  );
}

function TenantApiKeysCard({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const keysQuery = useQuery({
    queryKey: ['admin', 'tenant', tenantId, 'api-keys'],
    queryFn: () => adminService.getTenantApiKeys(tenantId),
  });

  const keys = keysQuery.data?.results ?? [];

  return (
    <Card padding={false}>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2 bg-blue-50">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{tenantName}</h3>
            <p className="text-xs text-gray-500">{keys.length} key{keys.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {keysQuery.isLoading ? (
        <Spinner className="py-6" size="sm" />
      ) : keysQuery.isError ? (
        <Alert
          className="m-4"
          action={<Button variant="ghost" size="sm" onClick={() => keysQuery.refetch()}>Retry</Button>}
        >
          {getApiErrorMessage(keysQuery.error, `Unable to load API keys for ${tenantName}.`)}
        </Alert>
      ) : keys.length === 0 ? (
        <p className="px-6 py-4 text-sm text-gray-400">No API keys.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prefix</th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {keys.map(key => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{key.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 font-mono">{key.prefix}...</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {key.permissions?.map(p => (
                        <Badge key={p} variant="info">{p}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={key.revoked ? 'danger' : 'success'}>
                      {key.revoked ? 'Revoked' : 'Active'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatRelativeDate(key.created)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {key.last_used ? formatRelativeDate(key.last_used) : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
