import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminService } from '@/services/adminService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { StorageBar } from '@/components/ui/StorageBar';
import { formatRelativeDate } from '@/lib/utils';
import { MagnifyingGlassIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';

type SortField = 'name' | 'storage_used' | 'created_at' | 'member_count' | 'file_count';
type SortDir = 'asc' | 'desc';

export function TenantsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const tenantsQuery = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: adminService.listTenants,
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const tenants = useMemo(() => {
    let list = tenantsQuery.data ?? [];

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || t.owner_email?.toLowerCase().includes(q));
    }

    // Filter by status
    if (statusFilter === 'active') list = list.filter(t => t.is_active);
    if (statusFilter === 'inactive') list = list.filter(t => !t.is_active);

    // Sort
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'storage_used') cmp = a.storage_used - b.storage_used;
      else if (sortField === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortField === 'member_count') cmp = (a.member_count ?? 0) - (b.member_count ?? 0);
      else if (sortField === 'file_count') cmp = (a.file_count ?? 0) - (b.file_count ?? 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tenantsQuery.data, search, statusFilter, sortField, sortDir]);

  if (tenantsQuery.isLoading) {
    return <Spinner className="py-20" size="lg" />;
  }

  if (tenantsQuery.isError) {
    return (
      <div className="text-center py-20 text-red-500">
        Failed to load tenants.
      </div>
    );
  }

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ChevronUpDownIcon className={`h-3.5 w-3.5 ${sortField === field ? 'text-blue-600' : 'text-gray-400'}`} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage all tenant organizations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader field="name" label="Name" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <SortHeader field="member_count" label="Members" />
                <SortHeader field="file_count" label="Files" />
                <SortHeader field="storage_used" label="Storage" />
                <SortHeader field="created_at" label="Created" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{tenant.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {tenant.owner_email ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={tenant.is_active ? 'success' : 'danger'}>
                      {tenant.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {tenant.member_count ?? 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {tenant.file_count ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-40">
                      <StorageBar
                        used={tenant.storage_used}
                        quota={tenant.storage_quota}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatRelativeDate(tenant.created_at)}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
