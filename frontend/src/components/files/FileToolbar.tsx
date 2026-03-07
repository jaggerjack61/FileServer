import {
  ArchiveBoxArrowDownIcon,
  ArchiveBoxIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  DocumentDuplicateIcon,
  FolderPlusIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ScissorsIcon,
  TrashIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'table';

interface FileToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  hasFiles?: boolean;
  selectionMode?: boolean;
  selectedCount?: number;
  onEnterSelectionMode?: () => void;
  onExitSelectionMode?: () => void;
  onSelectAll?: () => void;
  onBulkCopy?: () => void;
  onBulkCut?: () => void;
  onBulkDelete?: () => void;
  onBulkMove?: () => void;
  onBulkCompress?: () => void;
  onBulkExtract?: () => void;
  canExtractSelected?: boolean;
  onPaste?: () => void;
  canPaste?: boolean;
  clipboardLabel?: string | null;
  statusMessage?: string | null;
  statusTone?: 'neutral' | 'success' | 'error';
  onClearSelection?: () => void;
}

export function FileToolbar({
  viewMode,
  onViewModeChange,
  onUploadClick,
  onNewFolderClick,
  hasFiles = false,
  selectionMode = false,
  selectedCount = 0,
  onEnterSelectionMode,
  onExitSelectionMode,
  onSelectAll,
  onBulkCopy,
  onBulkCut,
  onBulkDelete,
  onBulkMove,
  onBulkCompress,
  onBulkExtract,
  canExtractSelected = false,
  onPaste,
  canPaste = false,
  clipboardLabel,
  statusMessage,
  statusTone = 'neutral',
  onClearSelection,
}: FileToolbarProps) {
  const isSelecting = selectionMode || selectedCount > 0;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {isSelecting ? (
          <>
            <span className="text-sm font-medium text-blue-600">
              {selectedCount > 0 ? `${selectedCount} selected` : 'Select files'}
            </span>
            {hasFiles && onSelectAll && (
              <Button variant="ghost" size="sm" onClick={onSelectAll}>
                <CheckCircleIcon className="h-4 w-4" />
                Select all
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              <XMarkIcon className="h-4 w-4" />
              Clear
            </Button>
            {selectedCount > 0 && onBulkCopy && (
              <Button variant="secondary" size="sm" onClick={onBulkCopy}>
                <DocumentDuplicateIcon className="h-4 w-4" />
                Copy
              </Button>
            )}
            {selectedCount > 0 && onBulkCut && (
              <Button variant="secondary" size="sm" onClick={onBulkCut}>
                <ScissorsIcon className="h-4 w-4" />
                Cut
              </Button>
            )}
            {selectedCount > 0 && onBulkMove && (
              <Button variant="secondary" size="sm" onClick={onBulkMove}>
                <ArrowRightIcon className="h-4 w-4" />
                Move
              </Button>
            )}
            {selectedCount > 0 && onBulkCompress && (
              <Button variant="secondary" size="sm" onClick={onBulkCompress}>
                <ArchiveBoxIcon className="h-4 w-4" />
                Compress
              </Button>
            )}
            {selectedCount > 0 && onBulkExtract && canExtractSelected && (
              <Button variant="secondary" size="sm" onClick={onBulkExtract}>
                <ArchiveBoxArrowDownIcon className="h-4 w-4" />
                Extract
              </Button>
            )}
            {selectedCount > 0 && onBulkDelete && (
              <Button variant="danger" size="sm" onClick={onBulkDelete}>
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            )}
            {onExitSelectionMode && (
              <Button variant="ghost" size="sm" onClick={onExitSelectionMode}>
                Done
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
            {hasFiles && onEnterSelectionMode && (
              <Button variant="secondary" onClick={onEnterSelectionMode} size="md">
                <CheckCircleIcon className="h-4 w-4" />
                Select Files
              </Button>
            )}
          </>
        )}

        {onPaste && clipboardLabel && (
          <Button variant="secondary" size="sm" onClick={onPaste} disabled={!canPaste}>
            <ClipboardDocumentIcon className="h-4 w-4" />
            Paste
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        {(statusMessage || clipboardLabel) && (
          <span
            className={cn(
              'text-sm',
              statusTone === 'error' && 'text-red-600',
              statusTone === 'success' && 'text-emerald-600',
              statusTone === 'neutral' && 'text-gray-500'
            )}
          >
            {statusMessage || clipboardLabel}
          </span>
        )}

        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/[0.06]">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              viewMode === 'grid'
                ? 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white'
                : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
            )}
          >
            <Squares2X2Icon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              viewMode === 'table'
                ? 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white'
                : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
            )}
          >
            <ListBulletIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
