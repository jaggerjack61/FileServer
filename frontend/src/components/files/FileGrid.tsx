import type { FileItem } from '@/types';
import { FileCard } from './FileCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FolderPlusIcon } from '@heroicons/react/24/outline';

interface FileGridProps {
  files: FileItem[];
  selectedFiles?: Set<string>;
  showSelection?: boolean;
  onSelect?: (id: string) => void;
  onDownload: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
  onCopy?: (file: FileItem) => void;
  onCut?: (file: FileItem) => void;
  onMove?: (file: FileItem) => void;
  onCompress?: (file: FileItem) => void;
  onExtract?: (file: FileItem) => void;
  onContextMenu?: (e: React.MouseEvent, file: FileItem) => void;
  onOpenPreview?: (file: FileItem) => void;
}

export function FileGrid({
  files,
  selectedFiles,
  showSelection,
  onSelect,
  onDownload,
  onDelete,
  onRename,
  onCopy,
  onCut,
  onMove,
  onCompress,
  onExtract,
  onContextMenu,
  onOpenPreview,
}: FileGridProps) {
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
          showSelection={showSelection}
          onSelect={onSelect}
          onDownload={() => onDownload(file)}
          onDelete={() => onDelete(file)}
          onRename={() => onRename(file)}
          onCopy={onCopy ? () => onCopy(file) : undefined}
          onCut={onCut ? () => onCut(file) : undefined}
          onMove={onMove ? () => onMove(file) : undefined}
          onCompress={onCompress ? () => onCompress(file) : undefined}
          onExtract={onExtract ? () => onExtract(file) : undefined}
          onContextMenu={onContextMenu ? (e: React.MouseEvent) => onContextMenu(e, file) : undefined}
          onDoubleClick={onOpenPreview ? () => onOpenPreview(file) : undefined}
        />
      ))}
    </div>
  );
}
