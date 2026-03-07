import {
  ArchiveBoxArrowDownIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  InformationCircleIcon,
  PencilIcon,
  ScissorsIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef } from 'react';

interface FileContextMenuProps {
  x: number;
  y: number;
  onDownload: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onRename: () => void;
  onMove?: () => void;
  onCompress?: () => void;
  onExtract?: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onProperties: () => void;
  onClose: () => void;
}

export function FileContextMenu({
  x,
  y,
  onDownload,
  onCopy,
  onCut,
  onRename,
  onMove,
  onCompress,
  onExtract,
  onDelete,
  onPreview,
  onProperties,
  onClose,
}: FileContextMenuProps) {
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
            onPreview();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <EyeIcon className="h-4 w-4" />
          Preview
        </button>
        <button
          onClick={() => {
            onProperties();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <InformationCircleIcon className="h-4 w-4" />
          Properties
        </button>
        <button
          onClick={() => {
            onDownload();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download
        </button>
        {onCopy && (
          <button
            onClick={() => {
              onCopy();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            Copy
          </button>
        )}
        {onCut && (
          <button
            onClick={() => {
              onCut();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ScissorsIcon className="h-4 w-4" />
            Cut
          </button>
        )}
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
        {onMove && (
          <button
            onClick={() => {
              onMove();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ArrowRightIcon className="h-4 w-4" />
            Move
          </button>
        )}
        {onCompress && (
          <button
            onClick={() => {
              onCompress();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ArchiveBoxIcon className="h-4 w-4" />
            Compress
          </button>
        )}
        {onExtract && (
          <button
            onClick={() => {
              onExtract();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ArchiveBoxArrowDownIcon className="h-4 w-4" />
            Extract
          </button>
        )}
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
