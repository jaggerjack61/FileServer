import { useMemo, useState } from 'react';
import {
  Bars3BottomLeftIcon,
  DocumentTextIcon,
  PlusIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { OfficeContent, OfficePresentationContent, OfficeSpreadsheetContent, OfficeWordContent } from '@/types';

interface OfficeEditorProps {
  content: OfficeContent;
  onChange: (content: OfficeContent) => void;
  readOnly?: boolean;
}

function getColumnLabel(index: number): string {
  let current = index + 1;
  let result = '';
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getCellLabel(row: number, col: number) {
  return `${getColumnLabel(col)}${row + 1}`;
}

function ToolbarChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
      {children}
    </span>
  );
}

function FauxToolButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
      tabIndex={-1}
    >
      {label}
    </button>
  );
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

function WordEditor({ content, onChange, readOnly }: { content: OfficeWordContent; onChange: (content: OfficeContent) => void; readOnly: boolean }) {
  const updateParagraph = (index: number, value: string) => {
    const nextParagraphs = content.paragraphs.map((paragraph, paragraphIndex) => (
      paragraphIndex === index ? { ...paragraph, text: value } : paragraph
    ));
    onChange({ ...content, paragraphs: nextParagraphs });
  };

  const addParagraph = () => {
    onChange({ ...content, paragraphs: [...content.paragraphs, { text: '' }] });
  };

  const removeParagraph = (index: number) => {
    const remaining = content.paragraphs.filter((_, paragraphIndex) => paragraphIndex !== index);
    onChange({ ...content, paragraphs: remaining.length > 0 ? remaining : [{ text: '' }] });
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#eef2f8] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-slate-50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <DocumentTextIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Document Workspace</p>
              <p className="text-xs text-slate-500">Focused page canvas with lightweight editing controls</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToolbarChip>{readOnly ? 'Viewing' : 'Editing'}</ToolbarChip>
            <ToolbarChip>{content.paragraphs.length} paragraphs</ToolbarChip>
            {!readOnly && (
              <Button variant="secondary" size="sm" onClick={addParagraph}>
                <PlusIcon className="h-4 w-4" />
                Add Paragraph
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
          <ToolbarChip>Normal text</ToolbarChip>
          <FauxToolButton label="B" />
          <FauxToolButton label="I" />
          <FauxToolButton label="U" />
          <div className="mx-1 h-6 w-px bg-slate-200" />
          <FauxToolButton label="Left" />
          <FauxToolButton label="Center" />
          <FauxToolButton label="Checklist" />
        </div>

        <div className="mt-4 mx-auto flex max-w-[860px] items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-inner">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Ruler</span>
          <div className="h-px flex-1 bg-[linear-gradient(to_right,rgba(148,163,184,0.35)_0,rgba(148,163,184,0.35)_1px,transparent_1px,transparent_48px)] bg-[length:48px_1px]" />
        </div>
      </div>

      <div className="max-h-[68vh] overflow-auto px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-[860px] rounded-[30px] bg-white px-6 py-4 text-center shadow-sm sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">All changes are stored locally</p>
        </div>

        <div className="mx-auto mt-6 max-w-[860px] rounded-[6px] border border-slate-200 bg-white px-8 py-10 shadow-[0_30px_80px_rgba(15,23,42,0.14)] sm:px-20 sm:py-16">
          <div className="space-y-8">
            {content.paragraphs.map((paragraph, index) => (
              <div key={`paragraph-${index}`} className="group space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300">
                  <span>Paragraph {index + 1}</span>
                  {!readOnly && content.paragraphs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParagraph(index)}
                      className="opacity-0 transition-opacity group-hover:opacity-100 text-[11px] tracking-[0.15em] text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {readOnly ? (
                  <div className="min-h-[32px] whitespace-pre-wrap text-[15px] leading-8 text-slate-800">
                    {paragraph.text || ' '}
                  </div>
                ) : (
                  <textarea
                    value={paragraph.text}
                    onChange={(event) => updateParagraph(index, event.target.value)}
                    readOnly={readOnly}
                    className="min-h-[84px] w-full resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-8 text-slate-800 outline-none focus:ring-0"
                    placeholder="Start writing..."
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpreadsheetEditor({ content, onChange, readOnly }: { content: OfficeSpreadsheetContent; onChange: (content: OfficeContent) => void; readOnly: boolean }) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const activeSheet = content.sheets[activeSheetIndex] ?? content.sheets[0];

  const columnCount = useMemo(() => {
    if (!activeSheet) return 1;
    return Math.max(1, ...activeSheet.rows.map((row) => row.length));
  }, [activeSheet]);

  const rowCount = useMemo(() => {
    if (!activeSheet) return 1;
    return Math.max(1, activeSheet.rows.length);
  }, [activeSheet]);

  const updateSheet = (sheetIndex: number, nextRows: string[][], nextName?: string) => {
    const nextSheets = content.sheets.map((sheet, currentIndex) => {
      if (currentIndex !== sheetIndex) return sheet;
      return {
        ...sheet,
        name: nextName ?? sheet.name,
        rows: nextRows,
      };
    });
    onChange({ ...content, sheets: nextSheets });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = activeSheet.rows.map((row) => [...row]);
    while (nextRows.length <= rowIndex) nextRows.push([]);
    while ((nextRows[rowIndex]?.length ?? 0) <= colIndex) nextRows[rowIndex].push('');
    nextRows[rowIndex][colIndex] = value;
    updateSheet(activeSheetIndex, nextRows);
  };

  const addSheet = () => {
    const nextSheets = [...content.sheets, { name: `Sheet ${content.sheets.length + 1}`, rows: [['']] }];
    onChange({ ...content, sheets: nextSheets });
    setActiveSheetIndex(nextSheets.length - 1);
    setActiveCell({ row: 0, col: 0 });
  };

  const addRow = () => {
    const nextRows = [...activeSheet.rows.map((row) => [...row]), new Array(columnCount).fill('')];
    updateSheet(activeSheetIndex, nextRows);
  };

  const addColumn = () => {
    const nextRows = activeSheet.rows.map((row) => [...row, '']);
    updateSheet(activeSheetIndex, nextRows.length > 0 ? nextRows : [['']]);
  };

  const updateSheetName = (value: string) => {
    updateSheet(activeSheetIndex, activeSheet.rows.map((row) => [...row]), value);
  };

  const activeValue = activeSheet?.rows?.[activeCell.row]?.[activeCell.col] ?? '';

  const updateActiveCellValue = (value: string) => {
    updateCell(activeCell.row, activeCell.col, value);
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-emerald-200 bg-[#e8f1eb] shadow-[0_18px_50px_rgba(21,128,61,0.08)]">
      <div className="border-b border-emerald-200 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 px-5 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <TableCellsIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">Spreadsheet Workspace</p>
              <p className="text-xs text-emerald-50/90">Formula bar, tabs, and grid navigation inspired by Sheets</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToolbarChip>{readOnly ? 'Viewing' : 'Editing'}</ToolbarChip>
            <ToolbarChip>{rowCount} rows</ToolbarChip>
            <ToolbarChip>{columnCount} columns</ToolbarChip>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white/12 px-3 py-2 backdrop-blur-sm">
          <FauxToolButton label="Format" />
          <FauxToolButton label="Borders" />
          <FauxToolButton label="Merge" />
          <FauxToolButton label="Sort" />
          {!readOnly && <Button variant="secondary" size="sm" onClick={addRow}>Add Row</Button>}
          {!readOnly && <Button variant="secondary" size="sm" onClick={addColumn}>Add Column</Button>}
        </div>
      </div>

      <div className="border-b border-emerald-200 bg-white px-4 py-3">
        <div className="grid gap-3 lg:grid-cols-[130px_minmax(0,1fr)_220px]">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {getCellLabel(activeCell.row, activeCell.col)}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Bars3BottomLeftIcon className="h-4 w-4 text-gray-400" />
            <input
              value={activeValue}
              onChange={(event) => updateActiveCellValue(event.target.value)}
              readOnly={readOnly}
              className="w-full border-0 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              placeholder="Formula or value"
            />
          </div>
          <Input label="Sheet name" value={activeSheet?.name ?? ''} onChange={(event) => updateSheetName(event.target.value)} disabled={readOnly} />
        </div>
      </div>

      <div className="max-h-[66vh] overflow-auto bg-[#f7faf8] px-4 py-4">
        <div className="overflow-auto rounded-2xl border border-emerald-100 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
          <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-[#f7fbf8]">
              <th className="sticky left-0 top-0 z-20 w-14 border-b border-r border-emerald-100 bg-[#f2f7f3] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">#</th>
              {Array.from({ length: columnCount }).map((_, index) => (
                <th key={`col-${index}`} className="sticky top-0 z-10 min-w-[140px] border-b border-emerald-100 bg-[#f7fbf8] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {getColumnLabel(index)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => {
              const row = activeSheet.rows[rowIndex] ?? [];
              return (
              <tr key={`row-${rowIndex}`} className="align-top">
                <td className="sticky left-0 z-10 border-r border-t border-emerald-100 bg-[#f2f7f3] px-3 py-2 text-xs font-semibold text-gray-400">{rowIndex + 1}</td>
                {Array.from({ length: columnCount }).map((_, colIndex) => (
                  <td key={`cell-${rowIndex}-${colIndex}`} className="border-t border-emerald-100 px-0 py-0">
                    <input
                      value={row[colIndex] ?? ''}
                      onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                      onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
                      onClick={() => setActiveCell({ row: rowIndex, col: colIndex })}
                      readOnly={readOnly}
                      className={cn(
                        'h-11 w-full border-0 px-3 py-2 text-sm text-gray-900 outline-none',
                        activeCell.row === rowIndex && activeCell.col === colIndex
                          ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-500'
                          : 'bg-white hover:bg-emerald-50/40',
                        readOnly && 'cursor-default'
                      )}
                    />
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-auto rounded-2xl border border-emerald-100 bg-white px-3 py-2 shadow-sm">
          {content.sheets.map((sheet, index) => (
            <button
              key={`${sheet.name}-${index}`}
              type="button"
              onClick={() => {
                setActiveSheetIndex(index);
                setActiveCell({ row: 0, col: 0 });
              }}
              className={cn(
                'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                index === activeSheetIndex
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-emerald-50'
              )}
            >
              {sheet.name || `Sheet ${index + 1}`}
            </button>
          ))}

          {!readOnly && (
            <button
              type="button"
              onClick={addSheet}
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PresentationEditor({ content, onChange, readOnly }: { content: OfficePresentationContent; onChange: (content: OfficeContent) => void; readOnly: boolean }) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = content.slides[activeSlideIndex] ?? content.slides[0];

  const updateSlide = (slideIndex: number, nextSlide: OfficePresentationContent['slides'][number]) => {
    const nextSlides = content.slides.map((slide, currentIndex) => (
      currentIndex === slideIndex ? nextSlide : slide
    ));
    onChange({ ...content, slides: nextSlides });
  };

  const updateTitle = (value: string) => {
    updateSlide(activeSlideIndex, { ...activeSlide, title: value });
  };

  const updateShapeText = (shapeIndex: number, value: string) => {
    const nextShapes = activeSlide.shapes.map((shape, currentIndex) => (
      currentIndex === shapeIndex ? { ...shape, text: value } : shape
    ));
    updateSlide(activeSlideIndex, { ...activeSlide, shapes: nextShapes });
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-amber-200 bg-[#f8f2e8] shadow-[0_18px_50px_rgba(180,83,9,0.08)]">
      <div className="border-b border-amber-200 bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400 px-5 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <PresentationChartBarIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">Presentation Workspace</p>
              <p className="text-xs text-amber-50/90">Slide stage with thumbnail strip and editable placeholders</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToolbarChip>{readOnly ? 'Viewing' : 'Editing'}</ToolbarChip>
            <ToolbarChip>{content.slides.length} slides</ToolbarChip>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Slides</p>
          <div className="space-y-2">
            {content.slides.map((slide, index) => (
              <button
                key={`slide-${index}`}
                type="button"
                onClick={() => setActiveSlideIndex(index)}
                className={cn(
                  'w-full rounded-xl border p-2 text-left transition-colors',
                  index === activeSlideIndex ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className="aspect-video rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <p className="truncate text-[11px] font-semibold text-slate-800">{slide.title || 'Untitled slide'}</p>
                  <div className="mt-2 space-y-1.5">
                    {slide.shapes.slice(0, 3).map((shape) => (
                      <div key={`preview-shape-${shape.index}`} className="h-2 rounded-full bg-slate-200" />
                    ))}
                  </div>
                </div>
                <span className="mt-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Slide {index + 1}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            <div className="mx-auto aspect-video max-w-4xl rounded-[28px] bg-[#f3f4f6] p-6 shadow-inner">
              <div className="flex h-full flex-col rounded-[24px] bg-white px-8 py-8 shadow-[0_22px_70px_rgba(15,23,42,0.12)]">
                <div className="mx-auto w-full max-w-3xl">
                  <p className="text-3xl font-semibold text-slate-800">{activeSlide?.title || 'Untitled slide'}</p>
                  <div className="mt-6 space-y-4 text-slate-600">
                    {activeSlide?.shapes.length ? activeSlide.shapes.map((shape) => (
                      <div key={`stage-shape-${shape.index}`} className="rounded-2xl bg-slate-50 px-4 py-3 text-base shadow-sm">
                        {shape.text || 'Empty text box'}
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                        This slide has no editable text placeholders.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            <Input label="Slide title" value={activeSlide?.title ?? ''} onChange={(event) => updateTitle(event.target.value)} disabled={readOnly} />

            <div className="space-y-3">
              {activeSlide.shapes.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  This slide has no editable text placeholders.
                </div>
              )}

              {activeSlide.shapes.map((shape, index) => (
                <div key={`shape-${shape.index}`} className="space-y-2 rounded-xl border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{shape.name}</p>
                  <textarea
                    value={shape.text}
                    onChange={(event) => updateShapeText(index, event.target.value)}
                    readOnly={readOnly}
                    className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 read-only:border-gray-200 read-only:bg-gray-50"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}