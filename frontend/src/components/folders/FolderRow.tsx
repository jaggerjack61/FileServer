import { useState, useCallback } from 'react';
import { FolderIcon } from '@heroicons/react/24/solid';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Folder } from '@/types';
import { formatRelativeDate } from '@/lib/utils';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';

interface FolderRowProps {
  folder: Folder;
  onClick: () => void;
  onDelete: () => void;
  onRename: () => void;
  onDropFiles?: (files: File[]) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function FolderRow({ folder, onClick, onDelete, onRename, onDropFiles, onContextMenu }: FolderRowProps) {
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
    <tr
      className={cn(
        'group transition-colors cursor-pointer',
        isDragOver ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-gray-50'
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <FolderIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900">{folder.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">—</td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {formatRelativeDate(folder.updated_at)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{folder.owner.username}</td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu
          trigger={
            <button className="rounded-lg p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 transition-all">
              <EllipsisVerticalIcon className="h-4 w-4" />
            </button>
          }
          items={[
            { label: 'Rename', icon: <PencilIcon className="h-4 w-4" />, onClick: onRename },
            { label: 'Delete', icon: <TrashIcon className="h-4 w-4" />, onClick: onDelete, danger: true },
          ]}
        />
      </td>
    </tr>
  );
}
