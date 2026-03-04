import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef } from 'react';

interface FolderContextMenuProps {
  x: number;
  y: number;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function FolderContextMenu({
  x,
  y,
  onRename,
  onDelete,
  onClose,
}: FolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position if menu overflows viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${window.innerWidth - rect.width - 8}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${window.innerHeight - rect.height - 8}px`;
      }
    }
  }, [x, y]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={menuRef}
        className="fixed z-50 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
        style={{ top: y, left: x }}
      >
        <button
          onClick={() => {
            onRename();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <PencilIcon className="h-4 w-4" />
          Rename
        </button>
        <div className="my-1 border-t border-gray-100" />
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
      </div>
    </>
  );
}
