import type { OfficeContent } from '@/types';
import { PresentationEditor } from '@/components/files/office-editor/presentation/PresentationEditor';
import { SpreadsheetEditor } from '@/components/files/office-editor/spreadsheet/SpreadsheetEditor';
import { WordEditor } from '@/components/files/office-editor/word/WordEditor';

interface OfficeEditorProps {
  content: OfficeContent;
  onChange: (content: OfficeContent) => void;
  readOnly?: boolean;
}

export function OfficeEditor({ content, onChange, readOnly = false }: OfficeEditorProps) {
  if (content.kind === 'word') {
    return <WordEditor content={content} onChange={onChange} readOnly={readOnly} />;
  }

  if (content.kind === 'spreadsheet') {
    return <SpreadsheetEditor content={content} onChange={onChange} readOnly={readOnly} />;
  }

  return <PresentationEditor content={content} onChange={onChange} readOnly={readOnly} />;
}
