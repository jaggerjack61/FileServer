import { useState, useCallback } from 'react';
import { FolderIcon } from '@heroicons/react/24/solid';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Folder } from '@/types';
import { formatRelativeDate } from '@/lib/utils';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';

interface FolderCardProps {
  folder: Folder;
  onClick: () => void;
  onDelete: () => void;
  onRename: () => void;
  onDropFiles?: (files: File[]) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function FolderCard({ folder, onClick, onDelete, onRename, onDropFiles, onContextMenu }: FolderCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0 && onDropFiles) {
      onDropFiles(droppedFiles);
    }
  }, [onDropFiles]);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border bg-white px-4 py-3 hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer dark:bg-white/[0.06] dark:hover:bg-white/[0.08] dark:hover:shadow-none',
        isDragOver
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 dark:border-cyan-400 dark:bg-cyan-400/10 dark:ring-cyan-400/30'
          : 'border-gray-200 dark:border-white/10'
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <FolderIcon className={cn('h-8 w-8 flex-shrink-0', isDragOver ? 'text-blue-600 dark:text-cyan-400' : 'text-blue-500 dark:text-cyan-300')} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate dark:text-white">{folder.name}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">
          {isDragOver ? 'Drop to upload here' : formatRelativeDate(folder.updated_at)}
        </p>
      </div>

      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu
          trigger={
            <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-300">
              <EllipsisVerticalIcon className="h-4 w-4" />
            </button>
          }
          items={[
            { label: 'Rename', icon: <PencilIcon className="h-4 w-4" />, onClick: onRename },
            { label: 'Delete', icon: <TrashIcon className="h-4 w-4" />, onClick: onDelete, danger: true },
          ]}
        />
      </div>
    </div>
  );
}
