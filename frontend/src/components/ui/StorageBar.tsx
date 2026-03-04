import { formatFileSize, getStoragePercentage, cn } from '@/lib/utils';

interface StorageBarProps {
  used: number;
  quota: number;
  className?: string;
  showLabel?: boolean;
}

export function StorageBar({ used, quota, className, showLabel = true }: StorageBarProps) {
  const percentage = getStoragePercentage(used, quota);

  const getBarColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-blue-600';
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1.5 text-xs text-gray-500">
          {formatFileSize(used)} of {formatFileSize(quota)} used ({percentage}%)
        </p>
      )}
    </div>
  );
}
