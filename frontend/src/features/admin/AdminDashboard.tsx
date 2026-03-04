import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminService } from '@/services/adminService';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { formatFileSize, formatRelativeDate } from '@/lib/utils';
import {
  ServerStackIcon,
  DocumentIcon,
  CircleStackIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  TrashIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function AdminDashboard() {
  const navigate = useNavigate();

  const storageQuery = useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: adminService.getStorageUsage,
  });

  const systemQuery = useQuery({
    queryKey: ['admin', 'system'],
    queryFn: adminService.getSystemMetrics,
  });

  const activityQuery = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: adminService.getActivityLog,
  });

  if (storageQuery.isLoading || systemQuery.isLoading) {
    return <Spinner className="py-20" size="lg" />;
  }

  if (storageQuery.isError || systemQuery.isError) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600 font-medium">Failed to load admin dashboard</p>
        <p className="text-sm text-gray-500 mt-1">You may not have permission to access this page.</p>
      </div>
    );
  }

  const storage = storageQuery.data;
  const system = systemQuery.data;
  const activities = activityQuery.data?.results ?? [];

  const chartData =
    storage?.tenants?.map((t) => ({
      name: t.name,
      used: Math.round(t.storage_used / (1024 * 1024)),
      quota: Math.round(t.storage_quota / (1024 * 1024)),
    })) ?? [];

  const pieData =
    storage?.tenants
      ?.filter((t) => t.storage_used > 0)
      .map((t) => ({
        name: t.name,
        value: t.storage_used,
      })) ?? [];

  const metrics = [
    {
      label: 'Total Tenants',
      value: system?.total_tenants ?? storage?.total_tenants ?? 0,
      sub: `${system?.active_tenants ?? 0} active`,
      icon: ServerStackIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      link: '/admin/tenants',
    },
    {
      label: 'Total Files',
      value: system?.total_files ?? storage?.total_files ?? 0,
      sub: `${system?.total_deleted_files ?? 0} in trash`,
      icon: DocumentIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Storage',
      value: formatFileSize(storage?.total_storage_used ?? 0),
      sub: `of ${formatFileSize(storage?.total_storage_quota ?? 0)}`,
      icon: CircleStackIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Total Users',
      value: system?.total_users ?? 0,
      sub: `${system?.active_users ?? 0} active`,
      icon: UserGroupIcon,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">System overview and health monitoring</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            hover={!!metric.link}
            onClick={metric.link ? () => navigate(metric.link!) : undefined}
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${metric.bg}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                {metric.sub && <p className="text-xs text-gray-400">{metric.sub}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* System Health */}
      {system && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'CPU Usage', value: system.cpu_usage, color: 'blue' },
              { label: 'Memory Usage', value: system.memory_usage, color: 'green' },
              { label: 'Disk Usage', value: system.disk_usage, color: 'purple' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-medium text-gray-900">{item.value}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.value >= 90 ? 'bg-red-500' : item.value >= 70 ? 'bg-yellow-500' : `bg-${item.color}-500`
                    }`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {system.uptime && (
            <p className="mt-4 text-xs text-gray-400">Uptime: {system.uptime}</p>
          )}
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Bar Chart */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Storage Usage by Tenant (MB)
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
            <p className="py-12 text-center text-gray-400">No data available</p>
          )}
        </Card>

        {/* Storage Pie Chart */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Storage Distribution
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatFileSize(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-gray-400">No storage data yet</p>
          )}
        </Card>
      </div>

      {/* Quick Links + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Links */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Manage Tenants', icon: ServerStackIcon, link: '/admin/tenants', color: 'text-blue-600' },
              { label: 'API Keys Overview', icon: ShieldCheckIcon, link: '/admin/api-keys', color: 'text-green-600' },
              { label: 'Activity Log', icon: ArrowUpTrayIcon, link: '/admin/activity', color: 'text-purple-600' },
              { label: 'View Trash', icon: TrashIcon, link: '/trash', color: 'text-red-600' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.link)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <button
                onClick={() => navigate('/admin/activity')}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                View all
              </button>
            </div>
            {activityQuery.isLoading ? (
              <Spinner className="py-8" />
            ) : activities.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">No recent activity.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {activities.slice(0, 8).map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className={`rounded p-1.5 ${entry.action === 'upload' ? 'bg-green-50' : 'bg-red-50'}`}>
                      {entry.action === 'upload' ? (
                        <ArrowUpTrayIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrashIcon className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{entry.filename}</p>
                      <p className="text-xs text-gray-500">{entry.user} &middot; {entry.tenant}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.action === 'upload' ? 'success' : 'danger'}>
                        {entry.action}
                      </Badge>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatRelativeDate(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
