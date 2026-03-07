import { useEffect, useState } from 'react';
import { ArrowTopRightOnSquareIcon, DocumentTextIcon, PresentationChartBarIcon, TableCellsIcon } from '@heroicons/react/24/outline';
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
  const officeLikeWorkspace = previewKind === 'document' && (canEditDocument || canEditOffice);

  const editorTitle = officeEditorKind === 'spreadsheet'
    ? 'Spreadsheet'
    : officeEditorKind === 'presentation'
      ? 'Presentation'
      : 'Document';

  const editorIcon = officeEditorKind === 'spreadsheet'
    ? <TableCellsIcon className="h-5 w-5" />
    : officeEditorKind === 'presentation'
      ? <PresentationChartBarIcon className="h-5 w-5" />
      : <DocumentTextIcon className="h-5 w-5" />;

  const handleSaveDocument = async () => {
    if (!onSaveDocument) {
      return;
    }

    try {
      await onSaveDocument(documentDraft);
      setIsEditingDocument(false);
    } catch {
      // Saving errors are surfaced by the caller.
    }
  };

  const handleSaveOffice = async () => {
    if (!onSaveOfficeContent || !officeDraft) {
      return;
    }

    try {
      await onSaveOfficeContent(officeDraft);
      setIsEditingDocument(false);
    } catch {
      // Saving errors are surfaced by the caller.
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={file.original_filename} size="xl">
      <div className="space-y-4">
        {officeLikeWorkspace && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                {editorIcon}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{editorTitle} editor</p>
                <p className="text-xs text-slate-500">Local-only workspace with a productivity-style layout</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">{isEditingDocument ? 'Editing mode' : 'Preview mode'}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">No external processing</span>
            </div>
          </div>
        )}

        <div className={officeLikeWorkspace ? 'min-h-[320px] max-h-[72vh] overflow-hidden' : 'bg-gray-100 rounded-lg p-4 min-h-[320px] max-h-[72vh] overflow-auto'}>
          {loading && (
            <div className="h-full min-h-[260px] flex items-center justify-center text-gray-500 text-sm">
              Loading preview...
            </div>
          )}

          {!loading && error && (
            <div className="h-full min-h-[260px] flex items-center justify-center text-red-600 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && previewKind === 'image' && previewUrl && (
            <div className="flex items-center justify-center">
              <img src={previewUrl} alt={file.original_filename} className="max-h-[68vh] object-contain" />
            </div>
          )}

          {!loading && !error && previewKind === 'video' && previewUrl && (
            <video controls className="w-full max-h-[68vh] rounded bg-black" src={previewUrl} />
          )}

          {!loading && !error && previewKind === 'audio' && previewUrl && (
            <div className="h-full min-h-[260px] flex items-center justify-center">
              <audio controls className="w-full" src={previewUrl} />
            </div>
          )}

          {!loading && !error && previewKind === 'pdf' && previewUrl && (
            <iframe title={file.original_filename} src={previewUrl} className="w-full h-[68vh] rounded bg-white" />
          )}

          {!loading && !error && previewKind === 'document' && canEditDocument && !isEditingDocument && (
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#eef2f8] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">Viewing</span>
                  <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">Document page</span>
                </div>
              </div>
              <div className="max-h-[62vh] overflow-auto px-4 py-8 sm:px-8">
                <div className="mx-auto max-w-[860px] rounded-[6px] border border-slate-200 bg-white px-8 py-10 shadow-[0_30px_80px_rgba(15,23,42,0.14)] sm:px-20 sm:py-16">
                  <pre className="min-h-[260px] whitespace-pre-wrap break-words text-[15px] leading-8 text-slate-800">{previewText ?? 'No document preview available.'}</pre>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && previewKind === 'document' && canEditDocument && isEditingDocument && (
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#eef2f8] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">Editing</span>
                  <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">Document page</span>
                </div>
              </div>
              <div className="max-h-[62vh] overflow-auto px-4 py-8 sm:px-8">
                <div className="mx-auto max-w-[860px] rounded-[6px] border border-slate-200 bg-white px-8 py-10 shadow-[0_30px_80px_rgba(15,23,42,0.14)] sm:px-20 sm:py-16">
                  <textarea
                    value={documentDraft}
                    onChange={(event) => setDocumentDraft(event.target.value)}
                    className="min-h-[420px] w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-8 text-slate-800 outline-none focus:ring-0"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
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
              <iframe title={file.original_filename} src={previewUrl} className="w-full h-[62vh] rounded bg-white" />
              <p className="text-xs text-gray-500">
                Browser support varies for office-style documents. If this file does not render correctly here, download it to inspect or edit it locally.
              </p>
            </div>
          )}

          {!loading && !error && previewKind === 'none' && (
            <div className="h-full min-h-[260px] flex items-center justify-center text-gray-500 text-sm">
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
