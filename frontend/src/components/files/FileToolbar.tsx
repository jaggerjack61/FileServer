import {
  ArrowUpTrayIcon,
  FolderPlusIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TrashIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'table';

interface FileToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  selectedCount?: number;
  onBulkDelete?: () => void;
  onBulkMove?: () => void;
  onClearSelection?: () => void;
}

export function FileToolbar({
  viewMode,
  onViewModeChange,
  onUploadClick,
  onNewFolderClick,
  selectedCount = 0,
  onBulkDelete,
  onBulkMove,
  onClearSelection,
}: FileToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {selectedCount > 0 ? (
          <>
            <span className="text-sm font-medium text-blue-600">{selectedCount} selected</span>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              Clear
            </Button>
            {onBulkMove && (
              <Button variant="secondary" size="sm" onClick={onBulkMove}>
                <ArrowRightIcon className="h-4 w-4" />
                Move
              </Button>
            )}
            {onBulkDelete && (
              <Button variant="danger" size="sm" onClick={onBulkDelete}>
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            )}
          </>
        ) : (
          <>
            <Button onClick={onUploadClick} size="md">
              <ArrowUpTrayIcon className="h-4 w-4" />
              Upload
            </Button>
            <Button variant="secondary" onClick={onNewFolderClick} size="md">
              <FolderPlusIcon className="h-4 w-4" />
              New Folder
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
        <button
          onClick={() => onViewModeChange('grid')}
          className={cn(
            'rounded-md p-1.5 transition-colors',
            viewMode === 'grid'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-400 hover:text-gray-600'
          )}
        >
          <Squares2X2Icon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange('table')}
          className={cn(
            'rounded-md p-1.5 transition-colors',
            viewMode === 'table'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-400 hover:text-gray-600'
          )}
        >
          <ListBulletIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
