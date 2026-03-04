import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { folderService } from '@/services/folderService';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FolderIcon, ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import type { Folder } from '@/types';

interface MoveFileModalProps {
  open: boolean;
  onClose: () => void;
  onMove: (folderId: string | null) => void;
  loading?: boolean;
  title?: string;
}

export function MoveFileModal({ open, onClose, onMove, loading, title = 'Move to...' }: MoveFileModalProps) {
  const [currentParent, setCurrentParent] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([]);

  const foldersQuery = useQuery({
    queryKey: ['folders', { parentId: currentParent }],
    queryFn: () => folderService.list({ parent: currentParent }),
    enabled: open,
  });

  const folders = foldersQuery.data?.results ?? [];

  const navigateInto = (folder: Folder) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentParent(folder.id);
  };

  const navigateToRoot = () => {
    setBreadcrumbs([]);
    setCurrentParent(null);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      navigateToRoot();
      return;
    }
    const target = breadcrumbs[index];
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setCurrentParent(target.id);
  };

  const handleClose = () => {
    setCurrentParent(null);
    setBreadcrumbs([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={title} size="md">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-1 mb-3 text-sm flex-wrap">
        <button
          onClick={navigateToRoot}
          className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
        >
          <HomeIcon className="h-4 w-4" />
          <span>Root</span>
        </button>
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.id} className="flex items-center gap-1">
            <ChevronRightIcon className="h-3 w-3 text-gray-400" />
            <button
              onClick={() => navigateToBreadcrumb(i)}
              className={`hover:text-blue-600 transition-colors ${
                i === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500'
              }`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Folder list */}
      <div className="min-h-[200px] max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
        {/* Move here option */}
        <button
          onClick={() => onMove(currentParent)}
          disabled={loading}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-600 font-medium hover:bg-blue-50 border-b border-gray-100 transition-colors"
        >
          <FolderIcon className="h-5 w-5" />
          Move here{currentParent ? '' : ' (Root)'}
        </button>

        {foldersQuery.isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
            Loading folders...
          </div>
        ) : folders.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
            No subfolders
          </div>
        ) : (
          folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => navigateInto(folder)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FolderIcon className="h-5 w-5 text-blue-500" />
                <span>{folder.name}</span>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
            </button>
          ))
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
