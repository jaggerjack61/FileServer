import type { FileItem } from '@/types';
import { FileCard } from './FileCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FolderPlusIcon } from '@heroicons/react/24/outline';

interface FileGridProps {
  files: FileItem[];
  selectedFiles?: Set<string>;
  onSelect?: (id: string) => void;
  onDownload: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
  onMove?: (file: FileItem) => void;
  onContextMenu?: (e: React.MouseEvent, file: FileItem) => void;
  onOpenPreview?: (file: FileItem) => void;
}

export function FileGrid({ files, selectedFiles, onSelect, onDownload, onDelete, onRename, onMove, onContextMenu, onOpenPreview }: FileGridProps) {
  if (files.length === 0) {
    return (
      <EmptyState
        icon={<FolderPlusIcon className="h-16 w-16" />}
        title="No files yet"
        description="Upload files or create folders to get started."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          selected={selectedFiles?.has(file.id)}
          onSelect={onSelect}
          onDownload={() => onDownload(file)}
          onDelete={() => onDelete(file)}
          onRename={() => onRename(file)}
          onMove={onMove ? () => onMove(file) : undefined}
          onContextMenu={onContextMenu ? (e: React.MouseEvent) => onContextMenu(e, file) : undefined}
          onDoubleClick={onOpenPreview ? () => onOpenPreview(file) : undefined}
        />
      ))}
    </div>
  );
}
