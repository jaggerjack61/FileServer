import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { formatFileSize } from '@/lib/utils';
import {
  ServerStackIcon,
  DocumentIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function DashboardPage() {
  const storageQuery = useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: adminService.getStorageUsage,
  });

  if (storageQuery.isLoading) {
    return <Spinner className="py-20" size="lg" />;
  }

  if (storageQuery.isError) {
    return (
      <div className="text-center py-20 text-red-500">
        Failed to load dashboard data.
      </div>
    );
  }

  const storage = storageQuery.data;

  const chartData =
    storage?.tenants.map((t) => ({
      name: t.name,
      used: Math.round(t.storage_used / (1024 * 1024)),
      quota: Math.round(t.storage_quota / (1024 * 1024)),
    })) ?? [];

  const metrics = [
    {
      label: 'Total Tenants',
      value: storage?.total_tenants ?? 0,
      icon: ServerStackIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Files',
      value: storage?.total_files ?? 0,
      icon: DocumentIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Storage',
      value: formatFileSize(storage?.total_storage_used ?? 0),
      icon: CircleStackIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">System overview and statistics</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${metric.bg}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Storage Chart */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Storage by Tenant (MB)
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              />
              <Bar dataKey="used" fill="#3b82f6" name="Used (MB)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="quota" fill="#e5e7eb" name="Quota (MB)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-gray-400">No tenant data available</p>
        )}
      </Card>

      {/* Tenant Table */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Files
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Storage Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Quota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {storage?.tenants.map((tenant) => {
                const usage =
                  tenant.storage_quota > 0
                    ? Math.round((tenant.storage_used / tenant.storage_quota) * 100)
                    : 0;
                return (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tenant.file_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatFileSize(tenant.storage_used)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatFileSize(tenant.storage_quota)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              usage >= 90
                                ? 'bg-red-500'
                                : usage >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-blue-500'
                            }`}
                            style={{ width: `${usage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{usage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
