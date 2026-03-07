import { useEffect, useState } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { OfficeEditor } from '@/components/files/OfficeEditor';
import type { FileItem, OfficeContent } from '@/types';
import { getFilePreviewKind, getOfficeEditorKind, isEditableTextFile } from '@/lib/utils';

interface FilePreviewProps {
  file: FileItem | null;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  onSaveDocument?: (content: string) => Promise<void>;
  onSaveOfficeContent?: (content: OfficeContent) => Promise<void>;
  previewUrl: string | null;
  previewText: string | null;
  officeContent: OfficeContent | null;
  loading?: boolean;
  error?: string | null;
  saving?: boolean;
}

export function FilePreview({
  file,
  open,
  onClose,
  onDownload,
  onSaveDocument,
  onSaveOfficeContent,
  previewUrl,
  previewText,
  officeContent,
  loading = false,
  error = null,
  saving = false,
}: FilePreviewProps) {
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [documentDraft, setDocumentDraft] = useState('');
  const [officeDraft, setOfficeDraft] = useState<OfficeContent | null>(null);

  useEffect(() => {
    if (!open) {
      setIsEditingDocument(false);
      setDocumentDraft('');
      setOfficeDraft(null);
      return;
    }

    setIsEditingDocument(false);
    setDocumentDraft(previewText ?? '');
    setOfficeDraft(officeContent ? JSON.parse(JSON.stringify(officeContent)) as OfficeContent : null);
  }, [file?.id, open, previewText, officeContent]);

  if (!file) return null;

  const previewKind = getFilePreviewKind(file.file_type, file.original_filename);
  const officeEditorKind = getOfficeEditorKind(file.file_type, file.original_filename);
  const canEditDocument =
    previewKind === 'document' &&
    isEditableTextFile(file.file_type, file.original_filename) &&
    typeof onSaveDocument === 'function';
  const canEditOffice = previewKind === 'document' && !!officeContent && typeof onSaveOfficeContent === 'function';
  const isOfficePreview = !!officeEditorKind && canEditOffice;

  const handleSaveDocument = async () => {
    if (!onSaveDocument) return;
    try {
      await onSaveDocument(documentDraft);
      setIsEditingDocument(false);
    } catch {
      // Saving errors are surfaced by the caller.
    }
  };

  const handleSaveOffice = async () => {
    if (!onSaveOfficeContent || !officeDraft) return;
    try {
      await onSaveOfficeContent(officeDraft);
      setIsEditingDocument(false);
    } catch {
      // Saving errors are surfaced by the caller.
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={file.original_filename} size={isOfficePreview ? 'xl' : 'lg'}>
      <div className="space-y-4">
        <div className={isOfficePreview ? 'min-h-[320px] max-h-[72vh] overflow-hidden' : 'bg-gray-100 rounded-lg p-4 min-h-[220px] max-h-[420px] overflow-auto'}>
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

          {!loading && !error && previewKind === 'image' && previewUrl && (
            <div className="flex items-center justify-center">
              <img src={previewUrl} alt={file.original_filename} className="max-h-96 object-contain" />
            </div>
          )}

          {!loading && !error && previewKind === 'video' && previewUrl && (
            <video controls className="w-full max-h-96 rounded" src={previewUrl} />
          )}

          {!loading && !error && previewKind === 'audio' && previewUrl && (
            <div className="h-full min-h-[180px] flex items-center justify-center">
              <audio controls className="w-full" src={previewUrl} />
            </div>
          )}

          {!loading && !error && previewKind === 'pdf' && previewUrl && (
            <iframe title={file.original_filename} src={previewUrl} className="w-full h-96 rounded bg-white" />
          )}

          {!loading && !error && previewKind === 'document' && canEditDocument && !isEditingDocument && (
            <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">{previewText ?? 'No text preview available.'}</pre>
          )}

          {!loading && !error && previewKind === 'document' && canEditDocument && isEditingDocument && (
            <textarea
              value={documentDraft}
              onChange={(event) => setDocumentDraft(event.target.value)}
              className="min-h-[300px] w-full resize-none border-0 bg-transparent p-0 text-xs text-gray-800 outline-none focus:ring-0"
              spellCheck={false}
            />
          )}

          {!loading && !error && previewKind === 'document' && canEditOffice && officeDraft && (
            <OfficeEditor
              content={isEditingDocument ? officeDraft : officeContent!}
              onChange={setOfficeDraft}
              readOnly={!isEditingDocument}
            />
          )}

          {!loading && !error && previewKind === 'document' && !canEditDocument && !canEditOffice && previewUrl && (
            <div className="space-y-3">
              <iframe title={file.original_filename} src={previewUrl} className="w-full h-96 rounded bg-white" />
              <p className="text-xs text-gray-500">
                Browser support varies for office-style documents. If this file does not render correctly here, download it to inspect or edit it locally.
              </p>
            </div>
          )}

          {!loading && !error && previewKind === 'none' && (
            <div className="h-full min-h-[180px] flex items-center justify-center text-gray-500 text-sm">
              Preview is not available for this file type.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {officeEditorKind && !loading && !error && (
            <Button
              variant="secondary"
              onClick={() => window.open(`/office/${file.id}`, '_blank')}
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Open in Office
            </Button>
          )}
          {(canEditDocument || canEditOffice) && !loading && !error && !isEditingDocument && (
            <Button variant="secondary" onClick={() => setIsEditingDocument(true)}>
              Edit Document
            </Button>
          )}
          {(canEditDocument || canEditOffice) && !loading && !error && isEditingDocument && (
            <Button variant="secondary" onClick={() => {
              setIsEditingDocument(false);
              setDocumentDraft(previewText ?? '');
              setOfficeDraft(officeContent ? JSON.parse(JSON.stringify(officeContent)) as OfficeContent : null);
            }}>
              Cancel Edit
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {canEditDocument && !loading && !error && isEditingDocument && (
            <Button onClick={handleSaveDocument} loading={saving}>
              Save Changes
            </Button>
          )}
          {canEditOffice && !loading && !error && isEditingDocument && (
            <Button onClick={handleSaveOffice} loading={saving}>
              Save Changes
            </Button>
          )}
          <Button onClick={onDownload}>Download</Button>
        </div>
      </div>
    </Modal>
  );
}
