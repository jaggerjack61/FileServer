import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { FileItem } from '@/types';
import { formatFileSize, formatRelativeDate } from '@/lib/utils';

interface FilePreviewProps {
  file: FileItem | null;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  previewUrl: string | null;
  previewText: string | null;
  loading?: boolean;
  error?: string | null;
}

export function FilePreview({
  file,
  open,
  onClose,
  onDownload,
  previewUrl,
  previewText,
  loading = false,
  error = null,
}: FilePreviewProps) {
  if (!file) return null;

  const isImage = file.file_type.startsWith('image/');
  const isVideo = file.file_type.startsWith('video/');
  const isAudio = file.file_type.startsWith('audio/');
  const isPdf = file.file_type === 'application/pdf' || file.file_type.includes('pdf');
  const isText =
    file.file_type.startsWith('text/') ||
    file.file_type.includes('json') ||
    file.file_type.includes('xml') ||
    file.file_type.includes('javascript');

  return (
    <Modal open={open} onClose={onClose} title={file.original_filename} size="lg">
      <div className="space-y-4">
        <div className="bg-gray-100 rounded-lg p-4 min-h-[220px] max-h-[420px] overflow-auto">
          {loading && (
            <div className="h-full min-h-[180px] flex items-center justify-center text-gray-500 text-sm">
              Loading preview...
            </div>
          )}

          {!loading && error && (
            <div className="h-full min-h-[180px] flex items-center justify-center text-red-600 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && isImage && previewUrl && (
            <div className="flex items-center justify-center">
              <img src={previewUrl} alt={file.original_filename} className="max-h-96 object-contain" />
            </div>
          )}

          {!loading && !error && isVideo && previewUrl && (
            <video controls className="w-full max-h-96 rounded" src={previewUrl} />
          )}

          {!loading && !error && isAudio && previewUrl && (
            <div className="h-full min-h-[180px] flex items-center justify-center">
              <audio controls className="w-full" src={previewUrl} />
            </div>
          )}

          {!loading && !error && isPdf && previewUrl && (
            <iframe title={file.original_filename} src={previewUrl} className="w-full h-96 rounded bg-white" />
          )}

          {!loading && !error && isText && (
            <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">{previewText ?? 'No text preview available.'}</pre>
          )}

          {!loading && !error && !isImage && !isVideo && !isAudio && !isPdf && !isText && (
            <div className="h-full min-h-[180px] flex items-center justify-center text-gray-500 text-sm">
              Preview is not available for this file type.
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">File name</p>
            <p className="font-medium text-gray-900">{file.original_filename}</p>
          </div>
          <div>
            <p className="text-gray-500">Size</p>
            <p className="font-medium text-gray-900">{formatFileSize(file.file_size)}</p>
          </div>
          <div>
            <p className="text-gray-500">Type</p>
            <p className="font-medium text-gray-900">{file.file_type}</p>
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

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onDownload}>Download</Button>
        </div>
      </div>
    </Modal>
  );
}
