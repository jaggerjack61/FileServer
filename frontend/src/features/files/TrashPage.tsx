import { useState, useCallback } from 'react';
import { useTrashFiles, useRestoreFile, useDeleteFile } from '@/hooks/useFiles';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatFileSize, formatRelativeDate, getFileIcon, getFileColorClass } from '@/lib/utils';
import {
  TrashIcon,
  ArrowUturnLeftIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import type { FileItem } from '@/types';

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  photo: PhotoIcon,
  video: VideoCameraIcon,
  audio: MusicalNoteIcon,
  text: DocumentTextIcon,
  file: DocumentIcon,
  pdf: DocumentTextIcon,
  document: DocumentTextIcon,
  spreadsheet: DocumentTextIcon,
  presentation: DocumentTextIcon,
  archive: DocumentIcon,
};

export function TrashPage() {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [restoreConfirm, setRestoreConfirm] = useState<FileItem | null>(null);

  const trashQuery = useTrashFiles();
  const restoreMutation = useRestoreFile();

  const files = trashQuery.data?.results ?? [];

  const toggleSelect = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  }, [files, selectedFiles.size]);

  const handleRestore = (file: FileItem) => {
    restoreMutation.mutate(file.id, {
      onSuccess: () => {
        setRestoreConfirm(null);
        setSelectedFiles(prev => {
          const next = new Set(prev);
          next.delete(file.id);
          return next;
        });
      },
    });
  };

  const handleBulkRestore = () => {
    selectedFiles.forEach(id => {
      restoreMutation.mutate(id);
    });
    setSelectedFiles(new Set());
  };

  if (trashQuery.isLoading) {
    return <Spinner className="py-20" size="lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
          <p className="text-sm text-gray-500 mt-1">
            Deleted files can be restored from here
          </p>
        </div>
        {selectedFiles.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{selectedFiles.size} selected</span>
            <Button size="sm" onClick={handleBulkRestore} loading={restoreMutation.isPending}>
              <ArrowUturnLeftIcon className="h-4 w-4" />
              Restore Selected
            </Button>
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <EmptyState
          icon={<TrashIcon className="h-12 w-12" />}
          title="Trash is empty"
          description="Files you delete will appear here. You can restore them before they're permanently removed."
        />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedFiles.size === files.length && files.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deleted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map((file) => {
                  const iconType = getFileIcon(file.file_type);
                  const IconComponent = iconMap[iconType] || DocumentIcon;
                  const colorClass = getFileColorClass(file.file_type);

                  return (
                    <tr key={file.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => toggleSelect(file.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <IconComponent className={`h-5 w-5 flex-shrink-0 ${colorClass}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.original_filename}
                            </p>
                            <p className="text-xs text-gray-400">{file.file_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatFileSize(file.file_size)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatRelativeDate(file.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {file.owner.email}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRestoreConfirm(file)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" />
                          Restore
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Restore Confirm Modal */}
      <Modal
        open={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        title="Restore File"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Restore{' '}
          <span className="font-medium text-gray-900">{restoreConfirm?.original_filename}</span>{' '}
          to its original location?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRestoreConfirm(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => restoreConfirm && handleRestore(restoreConfirm)}
            loading={restoreMutation.isPending}
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
            Restore
          </Button>
        </div>
      </Modal>
    </div>
  );
}
