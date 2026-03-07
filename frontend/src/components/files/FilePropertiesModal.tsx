import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { FileItem } from '@/types';
import { formatFileSize, formatRelativeDate } from '@/lib/utils';

interface FilePropertiesModalProps {
  file: FileItem | null;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export function FilePropertiesModal({ file, open, onClose, onDownload }: FilePropertiesModalProps) {
  if (!file) {
    return null;
  }

  return (
    <Modal open={open} onClose={onClose} title="Properties" size="md">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">File name</p>
            <p className="font-medium text-gray-900 break-words">{file.original_filename}</p>
          </div>
          <div>
            <p className="text-gray-500">Size</p>
            <p className="font-medium text-gray-900">{formatFileSize(file.file_size)}</p>
          </div>
          <div>
            <p className="text-gray-500">Type</p>
            <p className="font-medium text-gray-900 break-words">{file.file_type}</p>
          </div>
          <div>
            <p className="text-gray-500">Modified</p>
            <p className="font-medium text-gray-900">{formatRelativeDate(file.updated_at)}</p>
          </div>
          <div>
            <p className="text-gray-500">Owner</p>
            <p className="font-medium text-gray-900">{file.owner.username}</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="font-medium text-gray-900">{formatRelativeDate(file.created_at)}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onDownload}>Download</Button>
        </div>
      </div>
    </Modal>
  );
}