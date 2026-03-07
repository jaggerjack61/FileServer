import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  DocumentTextIcon,
  PencilIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { fileService } from '@/services/fileService';
import { OfficeEditor } from '@/components/files/OfficeEditor';
import { Spinner } from '@/components/ui/Spinner';
import { cn, getOfficeEditorKind, type OfficeEditorKind } from '@/lib/utils';
import type { FileItem, OfficeContent } from '@/types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const suiteThemes: Record<OfficeEditorKind, { bg: string; accent: string; icon: typeof DocumentTextIcon; label: string }> = {
  word: { bg: 'from-blue-600 to-blue-500', accent: 'bg-blue-600', icon: DocumentTextIcon, label: 'Document' },
  spreadsheet: { bg: 'from-emerald-600 to-emerald-500', accent: 'bg-emerald-600', icon: TableCellsIcon, label: 'Spreadsheet' },
  presentation: { bg: 'from-amber-500 to-orange-400', accent: 'bg-amber-500', icon: PresentationChartBarIcon, label: 'Presentation' },
};

export function OfficeEditorPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  const [file, setFile] = useState<FileItem | null>(null);
  const [content, setContent] = useState<OfficeContent | null>(null);
  const [draft, setDraft] = useState<OfficeContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    if (!fileId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [fileData, officeContent] = await Promise.all([
          fileService.get(fileId),
          fileService.getOfficeContent(fileId),
        ]);
        if (cancelled) return;
        setFile(fileData);
        setContent(officeContent);
        setDraft(JSON.parse(JSON.stringify(officeContent)) as OfficeContent);
      } catch {
        if (!cancelled) setError('Unable to load this document. It may not exist or may not be a supported office format.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fileId]);

  const editorKind: OfficeEditorKind | null = file
    ? getOfficeEditorKind(file.file_type, file.original_filename)
    : content?.kind === 'word' ? 'word'
    : content?.kind === 'spreadsheet' ? 'spreadsheet'
    : content?.kind === 'presentation' ? 'presentation'
    : null;

  const theme = editorKind ? suiteThemes[editorKind] : suiteThemes.word;
  const ThemeIcon = theme.icon;

  const handleSave = useCallback(async () => {
    if (!fileId || !draft) return;
    setSaveState('saving');
    try {
      const updatedFile = await fileService.updateOfficeContent(fileId, draft);
      setFile(updatedFile);
      setContent(JSON.parse(JSON.stringify(draft)) as OfficeContent);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }, [fileId, draft]);

  const handleDownload = useCallback(async () => {
    if (!file) return;
    const blob = await fileService.download(file.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.original_filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [file]);

  const startEditing = useCallback(() => {
    setDraft(content ? JSON.parse(JSON.stringify(content)) as OfficeContent : null);
    setEditing(true);
  }, [content]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setDraft(content ? JSON.parse(JSON.stringify(content)) as OfficeContent : null);
  }, [content]);

  // ---------- Loading / error states ----------
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-500">Loading document…</p>
        </div>
      </div>
    );
  }

  if (error || !content || !draft) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold text-gray-800">Could not open document</p>
          <p className="mt-2 text-sm text-gray-500">{error ?? 'Unknown error.'}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#f8f9fa]">
      {/* ─── Google-style top bar ─── */}
      <header className="z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
        {/* Back + icon */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors',
            theme.accent,
            'hover:opacity-90',
          )}
          aria-label="Go back"
        >
          <ThemeIcon className="h-5 w-5" />
        </button>

        {/* Title area */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight text-gray-900">
            {file?.original_filename ?? 'Untitled'}
          </h1>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="capitalize">{theme.label}</span>
            <span className="text-gray-300">·</span>
            {editing ? (
              <span className="font-medium text-emerald-600">Editing</span>
            ) : (
              <span>View only</span>
            )}
            {saveState === 'saving' && <span className="ml-1 text-gray-400">Saving…</span>}
            {saveState === 'saved' && (
              <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600">
                <CheckIcon className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            {saveState === 'error' && <span className="ml-1 text-red-500">Save failed</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <PencilIcon className="h-4 w-4" /> Edit
            </button>
          )}

          {editing && (
            <>
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState === 'saving'}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-60',
                  `bg-gradient-to-r ${theme.bg} hover:opacity-90`,
                )}
              >
                {saveState === 'saving' ? 'Saving…' : 'Save'}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Download"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ─── Editor body ─── */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
          <OfficeEditor
            content={editing ? draft : content}
            onChange={setDraft}
            readOnly={!editing}
          />
        </div>
      </main>
    </div>
  );
}
