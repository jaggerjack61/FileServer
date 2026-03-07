import type { FileItem } from '@/types';
import { FileRow } from '@/components/files/FileRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { FolderPlusIcon } from '@heroicons/react/24/outline';

interface FileTableProps {
  files: FileItem[];
  selectedFiles?: Set<string>;
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
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

export function FileTable({
  files,
  selectedFiles,
  onSelect,
  onSelectAll,
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
}: FileTableProps) {
  if (files.length === 0) {
    return (
      <EmptyState
        icon={<FolderPlusIcon className="h-16 w-16" />}
        title="No files yet"
        description="Upload files or create folders to get started."
      />
    );
  }

  const allSelected = selectedFiles && files.length > 0 && files.every(f => selectedFiles.has(f.id));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {onSelect && (
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Modified
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Owner
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              selected={selectedFiles?.has(file.id)}
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
        </tbody>
      </table>
    </div>
  );
}
