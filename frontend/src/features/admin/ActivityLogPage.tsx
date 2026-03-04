import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatFileSize, formatRelativeDate } from '@/lib/utils';
import {
  ArrowUpTrayIcon,
  TrashIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export function ActivityLogPage() {
  const activityQuery = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: adminService.getActivityLog,
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  if (activityQuery.isLoading) {
    return <Spinner className="py-20" size="lg" />;
  }

  if (activityQuery.isError) {
    return (
      <div className="text-center py-20 text-red-500">
        Failed to load activity log.
      </div>
    );
  }

  const activities = activityQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Recent file uploads and deletions across all tenants
          </p>
        </div>
        <Badge variant="info">{activities.length} entries</Badge>
      </div>

      {activities.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ClockIcon className="h-12 w-12 mb-3" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs mt-1">File uploads and deletions will appear here.</p>
          </div>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {activities.map((entry, idx) => (
              <div key={idx} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className={`mt-0.5 rounded-lg p-2 ${entry.action === 'upload' ? 'bg-green-50' : 'bg-red-50'}`}>
                  {entry.action === 'upload' ? (
                    <ArrowUpTrayIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrashIcon className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.filename}
                    </p>
                    <Badge variant={entry.action === 'upload' ? 'success' : 'danger'}>
                      {entry.action === 'upload' ? 'Uploaded' : 'Deleted'}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span>{entry.user}</span>
                    <span>&middot;</span>
                    <span>{entry.tenant}</span>
                    <span>&middot;</span>
                    <span>{formatFileSize(entry.file_size)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {formatRelativeDate(entry.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
