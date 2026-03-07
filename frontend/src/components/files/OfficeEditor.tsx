import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode, TextareaHTMLAttributes } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type {
  OfficeContent,
  OfficeEmbeddedImage,
  OfficePresentationContent,
  OfficePresentationRun,
  OfficeSpreadsheetContent,
  OfficeSpreadsheetSheet,
  OfficeWordContent,
  OfficeWordParagraph,
  OfficeWordRun,
  OfficeWordTable,
} from '@/types';

interface OfficeEditorProps {
  content: OfficeContent;
  onChange: (content: OfficeContent) => void;
  readOnly?: boolean;
}

type RichTextRun = OfficeWordRun | OfficePresentationRun;

interface MergeAnchor {
  rowSpan: number;
  colSpan: number;
}

interface WordParagraphStyle {
  fontSize: number;
  fontWeight: number;
  color: string;
  marginBottom: number;
  prefix?: string;
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

function getCellLabel(row: number, col: number) {
  return `${getColumnLabel(col)}${row + 1}`;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function toCssColor(color?: string) {
  if (!color) {
    return undefined;
  }

  return color.startsWith('#') ? color : `#${color}`;
}

function toPointSize(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}pt` : undefined;
}

function getWordParagraphStyle(style?: string): WordParagraphStyle {
  switch (style) {
    case 'title':
      return { fontSize: 26, fontWeight: 400, color: '#202124', marginBottom: 18 };
    case 'subtitle':
      return { fontSize: 15, fontWeight: 400, color: '#666666', marginBottom: 18 };
    case 'heading1':
      return { fontSize: 20, fontWeight: 600, color: '#202124', marginBottom: 16 };
    case 'heading2':
      return { fontSize: 16, fontWeight: 600, color: '#202124', marginBottom: 14 };
    case 'heading3':
      return { fontSize: 14, fontWeight: 400, color: '#434343', marginBottom: 12 };
    case 'heading4':
      return { fontSize: 12, fontWeight: 600, color: '#202124', marginBottom: 10 };
    case 'list':
      return { fontSize: 11, fontWeight: 400, color: '#202124', marginBottom: 8, prefix: '\u2022 ' };
    default:
      return { fontSize: 11, fontWeight: 400, color: '#202124', marginBottom: 8 };
  }
}

function getWordParagraphMinHeight(style?: string) {
  switch (style) {
    case 'title':
      return 42;
    case 'heading1':
      return 36;
    case 'heading2':
      return 32;
    default:
      return 26;
  }
}

function getWordParagraphTextAlign(alignment?: OfficeWordParagraph['alignment']): CSSProperties['textAlign'] {
  return alignment ?? 'left';
}

function getSheetDimensions(sheet?: OfficeSpreadsheetSheet) {
  let rowCount = Math.max(1, sheet?.rows.length ?? 0);
  let columnCount = Math.max(1, ...(sheet?.rows.map((row) => row.length) ?? [1]));

  for (const key of Object.keys(sheet?.cells ?? {})) {
    const [rowIndexRaw, colIndexRaw] = key.split(',');
    const rowIndex = Number.parseInt(rowIndexRaw, 10);
    const colIndex = Number.parseInt(colIndexRaw, 10);

    if (!Number.isNaN(rowIndex)) {
      rowCount = Math.max(rowCount, rowIndex + 1);
    }
    if (!Number.isNaN(colIndex)) {
      columnCount = Math.max(columnCount, colIndex + 1);
    }
  }

  for (const mergedCell of sheet?.mergedCells ?? []) {
    const endRow = mergedCell[2] ?? 0;
    const endCol = mergedCell[3] ?? 0;
    rowCount = Math.max(rowCount, endRow + 1);
    columnCount = Math.max(columnCount, endCol + 1);
  }

  columnCount = Math.max(columnCount, sheet?.columnWidths?.length ?? 0, 1);
  return { rowCount, columnCount };
}

function buildMergeState(mergedCells?: number[][]) {
  const anchors: Record<string, MergeAnchor> = {};
  const covered = new Set<string>();

  for (const range of mergedCells ?? []) {
    const [startRow, startCol, endRow, endCol] = range;
    if ([startRow, startCol, endRow, endCol].some((value) => typeof value !== 'number')) {
      continue;
    }

    anchors[`${startRow},${startCol}`] = {
      rowSpan: endRow - startRow + 1,
      colSpan: endCol - startCol + 1,
    };

    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
      for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
        if (rowIndex === startRow && colIndex === startCol) {
          continue;
        }
        covered.add(`${rowIndex},${colIndex}`);
      }
    }
  }

  return { anchors, covered };
}

function getColumnWidthPx(sheet: OfficeSpreadsheetSheet | undefined, columnIndex: number) {
  const width = sheet?.columnWidths?.[columnIndex];
  if (typeof width !== 'number' || !Number.isFinite(width)) {
    return 110;
  }
  return Math.max(48, Math.round(width * 7.5));
}

function isPositionedShape(shape: OfficePresentationContent['slides'][number]['shapes'][number]) {
  return [shape.left, shape.top, shape.width, shape.height].every(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );
}

function getSlidePreviewText(shape: OfficePresentationContent['slides'][number]['shapes'][number]) {
  const fromRuns = shape.runs?.map((run) => run.text).join('');
  return (fromRuns || shape.text || '').replace(/\s+/g, ' ').trim();
}

function ModeChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#dadce0] bg-white px-3 py-1 text-xs font-medium text-[#3c4043]">
      {children}
    </span>
  );
}

function RichText({ runs, fallback }: { runs?: RichTextRun[]; fallback: string }) {
  const normalizedRuns = runs && runs.length > 0 ? runs : [{ text: fallback }];

  return (
    <>
      {normalizedRuns.map((run, index) => (
        <span
          key={`run-${index}`}
          style={{
            fontWeight: run.bold ? 700 : undefined,
            fontStyle: run.italic ? 'italic' : undefined,
            textDecoration: 'underline' in run && run.underline ? 'underline' : undefined,
            fontSize: toPointSize(run.fontSize),
            color: toCssColor(run.color),
          }}
        >
          {run.text || ''}
        </span>
      ))}
    </>
  );
}

function RichParagraph({ paragraph }: { paragraph: OfficeWordParagraph }) {
  const paragraphStyle = getWordParagraphStyle(paragraph.style);
  const textContent = paragraph.text || '\u00A0';

  return (
    <p
      className="whitespace-pre-wrap break-words"
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: `${paragraphStyle.fontSize}pt`,
        fontWeight: paragraphStyle.fontWeight,
        color: paragraphStyle.color,
        lineHeight: 1.15,
        marginBottom: `${paragraphStyle.marginBottom}px`,
        textAlign: getWordParagraphTextAlign(paragraph.alignment),
      }}
    >
      {paragraphStyle.prefix ? <span>{paragraphStyle.prefix}</span> : null}
      <RichText runs={paragraph.runs} fallback={textContent} />
    </p>
  );
}

function WordParagraphTextarea({
  paragraph,
  onChange,
  ...props
}: {
  paragraph: OfficeWordParagraph;
  onChange: (value: string) => void;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'>) {
  const paragraphStyle = getWordParagraphStyle(paragraph.style);

  return (
    <textarea
      value={paragraph.text}
      onChange={(event) => onChange(event.target.value)}
      className="w-full resize-none border-0 bg-transparent px-0 py-0 outline-none focus:ring-0"
      style={{
        minHeight: `${getWordParagraphMinHeight(paragraph.style)}px`,
        fontFamily: 'Arial, sans-serif',
        fontSize: `${paragraphStyle.fontSize}pt`,
        fontWeight: paragraphStyle.fontWeight,
        color: paragraphStyle.color,
        lineHeight: 1.15,
        textAlign: getWordParagraphTextAlign(paragraph.alignment),
      }}
      {...props}
    />
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

function WordTableView({ table }: { table: OfficeWordTable }) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse border border-[#dadce0]">
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`table-row-${rowIndex}`}>
              {row.map((cell, colIndex) => (
                <td
                  key={`table-cell-${rowIndex}-${colIndex}`}
                  className="border border-[#dadce0] px-3 py-2 text-[11pt] text-[#202124] align-top"
                  style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.15 }}
                >
                  <RichText runs={cell.runs} fallback={cell.text || '\u00A0'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmbeddedImages({ images }: { images: OfficeEmbeddedImage[] }) {
  if (!images.length) return null;

  return (
    <div className="mt-6 border-t border-[#e0e0e0] pt-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Embedded Images</p>
      <div className="flex flex-wrap gap-4">
        {images.map((image, index) => (
          <img
            key={`embedded-image-${index}`}
            src={image.dataUri}
            alt={`Embedded image ${index + 1}`}
            className="max-h-[300px] max-w-full rounded border border-[#dadce0] object-contain"
          />
        ))}
      </div>
    </div>
  );
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

  // When blocks ordering is present, render paragraphs and tables interleaved.
  // Otherwise fall back to the original paragraphs-only rendering.
  const hasBlocks = readOnly && content.blocks && content.blocks.length > 0;

  return (
    <div className="overflow-hidden border border-[#dadce0] bg-[#f8f9fa]">
      <div className="flex items-center justify-between gap-3 border-b border-[#e0e0e0] bg-white px-5 py-4">
        <ModeChip>{readOnly ? 'Viewing' : 'Editing'}</ModeChip>
        {!readOnly ? (
          <Button variant="secondary" size="sm" onClick={addParagraph} className="border-[#dadce0] text-[#1a73e8]">
            <PlusIcon className="h-4 w-4" />
            Add Paragraph
          </Button>
        ) : null}
      </div>

      <div className="max-h-[68vh] overflow-auto px-4 py-8 sm:px-6">
        <div
          className="mx-auto max-w-[816px] overflow-visible bg-white px-8 py-10 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)] sm:px-24 sm:py-20"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {hasBlocks ? (
            <div className="space-y-0">
              {content.blocks!.map((block, blockIndex) => {
                if (block.type === 'table') {
                  const table = content.tables?.[block.index];
                  return table ? <WordTableView key={`block-table-${blockIndex}`} table={table} /> : null;
                }
                const paragraph = content.paragraphs[block.index];
                return paragraph ? (
                  <div key={`block-para-${blockIndex}`}>
                    <RichParagraph paragraph={paragraph} />
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <div className="space-y-0">
              {content.paragraphs.map((paragraph, index) => (
                <div key={`paragraph-${index}`} className="group relative overflow-visible">
                  {readOnly ? (
                    <RichParagraph paragraph={paragraph} />
                  ) : (
                    <div style={{ marginBottom: `${getWordParagraphStyle(paragraph.style).marginBottom}px` }}>
                      <WordParagraphTextarea
                        paragraph={paragraph}
                        onChange={(value) => updateParagraph(index, value)}
                        placeholder="Start writing"
                      />
                      {content.paragraphs.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeParagraph(index)}
                          className="absolute left-full top-1 ml-4 whitespace-nowrap rounded-full border border-[#dadce0] bg-white px-3 py-1 text-xs font-medium text-[#d93025] opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!readOnly ? (
            <div className="mt-8 flex justify-start">
              <Button variant="secondary" size="sm" onClick={addParagraph} className="border-[#dadce0] text-[#1a73e8]">
                <PlusIcon className="h-4 w-4" />
                Add Paragraph
              </Button>
            </div>
          ) : null}

          {readOnly && content.images && content.images.length > 0 ? (
            <EmbeddedImages images={content.images} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SpreadsheetEditor({ content, onChange, readOnly }: { content: OfficeSpreadsheetContent; onChange: (content: OfficeContent) => void; readOnly: boolean }) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const activeSheet = content.sheets[activeSheetIndex] ?? content.sheets[0];

  const { rowCount, columnCount } = useMemo(() => getSheetDimensions(activeSheet), [activeSheet]);
  const mergeState = useMemo(() => buildMergeState(readOnly ? activeSheet?.mergedCells : undefined), [activeSheet?.mergedCells, readOnly]);
  const columnWidths = useMemo(
    () => Array.from({ length: columnCount }, (_, index) => getColumnWidthPx(activeSheet, index)),
    [activeSheet, columnCount]
  );

  const updateSheet = (sheetIndex: number, nextRows: string[][], nextName?: string) => {
    const nextSheets = content.sheets.map((sheet, currentIndex) => {
      if (currentIndex !== sheetIndex) {
        return sheet;
      }

      return {
        ...sheet,
        name: nextName ?? sheet.name,
        rows: nextRows,
      };
    });

    onChange({ ...content, sheets: nextSheets });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = (activeSheet?.rows ?? [['']]).map((row) => [...row]);
    while (nextRows.length <= rowIndex) {
      nextRows.push([]);
    }
    while ((nextRows[rowIndex]?.length ?? 0) <= colIndex) {
      nextRows[rowIndex].push('');
    }
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
    const nextRows = [...(activeSheet?.rows ?? [['']]).map((row) => [...row]), new Array(columnCount).fill('')];
    updateSheet(activeSheetIndex, nextRows);
  };

  const addColumn = () => {
    const baseRows = activeSheet?.rows?.length ? activeSheet.rows : [['']];
    const nextRows = baseRows.map((row) => [...row, '']);
    updateSheet(activeSheetIndex, nextRows);
  };

  const updateSheetName = (value: string) => {
    updateSheet(activeSheetIndex, (activeSheet?.rows ?? [['']]).map((row) => [...row]), value);
  };

  const activeValue = activeSheet?.rows?.[activeCell.row]?.[activeCell.col] ?? '';
  const tableMinWidth = 46 + columnWidths.reduce((total, width) => total + width, 0);

  return (
    <div className="overflow-hidden border border-[#dadce0] bg-white">
      <div className="border-b border-[#e0e0e0] bg-white px-4 py-3">
        <div className="flex items-center gap-0 overflow-hidden border border-[#dadce0] bg-white text-[13px] text-[#3c4043]">
          <div className="flex h-10 min-w-[72px] items-center justify-center border-r border-[#e0e0e0] bg-[#f8f9fa] font-medium">
            {getCellLabel(activeCell.row, activeCell.col)}
          </div>
          <input
            value={activeValue}
            onChange={(event) => updateCell(activeCell.row, activeCell.col, event.target.value)}
            readOnly={readOnly}
            className="h-10 w-full border-0 px-3 text-[13px] text-[#202124] outline-none placeholder:text-[#5f6368]"
            placeholder="Formula or value"
          />
        </div>
      </div>

      <div className="max-h-[66vh] overflow-auto bg-white p-4">
        {!readOnly ? (
          <div className="mb-3 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={addRow} className="rounded-md border-[#dadce0] px-2.5 py-1 text-[12px]">
              Add Row
            </Button>
            <Button variant="secondary" size="sm" onClick={addColumn} className="rounded-md border-[#dadce0] px-2.5 py-1 text-[12px]">
              Add Column
            </Button>
          </div>
        ) : null}

        <div className="overflow-auto border border-[#e2e2e2] bg-white">
          <table className="border-collapse table-fixed" style={{ minWidth: `${tableMinWidth}px` }}>
            <colgroup>
              <col style={{ width: '46px' }} />
              {columnWidths.map((width, index) => (
                <col key={`column-width-${index}`} style={{ width: `${width}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="h-[21px] border-b border-r border-[#e2e2e2] bg-[#f8f9fa] px-2 text-right align-middle text-[13px] font-medium text-[#5f6368]" />
                {Array.from({ length: columnCount }).map((_, index) => (
                  <th
                    key={`col-${index}`}
                    className="h-[21px] border-b border-r border-[#e2e2e2] bg-[#f8f9fa] px-2 text-center align-middle text-[13px] font-medium text-[#5f6368]"
                  >
                    {getColumnLabel(index)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  <td className="h-[21px] border-b border-r border-[#e2e2e2] bg-[#f8f9fa] px-2 text-right align-middle text-[13px] text-[#5f6368]">
                    {rowIndex + 1}
                  </td>
                  {Array.from({ length: columnCount }).map((_, colIndex) => {
                    const key = `${rowIndex},${colIndex}`;
                    if (readOnly && mergeState.covered.has(key)) {
                      return null;
                    }

                    const cellStyle = activeSheet?.cells?.[key];
                    const sharedStyle: CSSProperties = {
                      fontWeight: cellStyle?.bold ? 700 : 400,
                      fontStyle: cellStyle?.italic ? 'italic' : undefined,
                      color: toCssColor(cellStyle?.color) ?? '#202124',
                      backgroundColor: toCssColor(cellStyle?.bgColor) ?? '#ffffff',
                      fontSize: toPointSize(cellStyle?.fontSize) ?? '13px',
                      textAlign: (cellStyle?.align as CSSProperties['textAlign']) ?? 'left',
                    };
                    const isActive = activeCell.row === rowIndex && activeCell.col === colIndex;
                    const mergeAnchor = readOnly ? mergeState.anchors[key] : undefined;

                    return (
                      <td
                        key={`cell-${rowIndex}-${colIndex}`}
                        rowSpan={mergeAnchor?.rowSpan}
                        colSpan={mergeAnchor?.colSpan}
                        className="border-b border-r border-[#e2e2e2] p-0 align-top"
                        style={isActive ? { boxShadow: 'inset 0 0 0 2px #1a73e8' } : undefined}
                        onClick={() => setActiveCell({ row: rowIndex, col: colIndex })}
                      >
                        {readOnly ? (
                          <div
                            className="min-h-[21px] whitespace-pre-wrap px-2 py-0.5 text-[13px] leading-5 text-[#202124]"
                            style={sharedStyle}
                          >
                            {activeSheet?.rows?.[rowIndex]?.[colIndex] ?? ''}
                          </div>
                        ) : (
                          <input
                            value={activeSheet?.rows?.[rowIndex]?.[colIndex] ?? ''}
                            onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                            onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
                            className="h-[21px] w-full border-0 bg-white px-2 text-[13px] text-[#202124] outline-none"
                            style={{ textAlign: (cellStyle?.align as CSSProperties['textAlign']) ?? 'left' }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-end gap-1 overflow-auto border-t border-[#e0e0e0] bg-white pt-2">
          {content.sheets.map((sheet, index) => (
            <button
              key={`${sheet.name}-${index}`}
              type="button"
              onClick={() => {
                setActiveSheetIndex(index);
                setActiveCell({ row: 0, col: 0 });
              }}
              className={cn(
                'border-b-2 px-4 py-2 text-[13px] text-[#3c4043] transition-colors',
                index === activeSheetIndex ? 'border-[#1a73e8] text-[#202124]' : 'border-transparent hover:bg-[#f8f9fa]'
              )}
            >
              {index === activeSheetIndex && !readOnly ? (
                <input
                  value={sheet.name}
                  onChange={(event) => updateSheetName(event.target.value)}
                  className="min-w-[96px] border-0 bg-transparent text-[13px] outline-none"
                />
              ) : (
                <span>{sheet.name || `Sheet ${index + 1}`}</span>
              )}
            </button>
          ))}

          {!readOnly ? (
            <button
              type="button"
              onClick={addSheet}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-[#1a73e8] hover:bg-[#e8f0fe]"
              aria-label="Add sheet"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          ) : null}
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
    if (!activeSlide) {
      return;
    }
    updateSlide(activeSlideIndex, { ...activeSlide, title: value });
  };

  const updateShapeText = (shapeIndex: number, value: string) => {
    if (!activeSlide) {
      return;
    }

    const nextShapes = activeSlide.shapes.map((shape, currentIndex) => (
      currentIndex === shapeIndex ? { ...shape, text: value } : shape
    ));
    updateSlide(activeSlideIndex, { ...activeSlide, shapes: nextShapes });
  };

  const positionedShapes = activeSlide?.shapes.filter(isPositionedShape) ?? [];
  const flowShapes = activeSlide?.shapes.filter((shape) => !isPositionedShape(shape)) ?? [];

  return (
    <div className="overflow-hidden border border-[#dadce0] bg-white">
      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-r border-[#e0e0e0] bg-[#f1f3f4] p-4">
          <div className="space-y-3">
            {content.slides.map((slide, index) => (
              <button
                key={`slide-${index}`}
                type="button"
                onClick={() => setActiveSlideIndex(index)}
                className={cn(
                  'flex w-full items-start gap-3 border-l-4 px-2 py-2 text-left transition-colors',
                  index === activeSlideIndex ? 'border-[#1a73e8] bg-white/70' : 'border-transparent hover:bg-white/50'
                )}
              >
                <span className="pt-2 text-sm font-medium text-[#5f6368]">{index + 1}</span>
                <div className="w-full rounded-sm border border-[#dadce0] bg-white p-2 shadow-sm">
                  <div className="aspect-video overflow-hidden border border-[#e0e0e0] bg-white px-2 py-1.5 text-left">
                    <p className="truncate text-[10px] font-semibold text-[#202124]">{slide.title || 'Untitled slide'}</p>
                    <div className="mt-1 space-y-1">
                      {slide.shapes.slice(0, 3).map((shape) => (
                        <p key={`thumb-shape-${shape.index}`} className="truncate text-[9px] text-[#5f6368]">
                          {getSlidePreviewText(shape) || shape.name}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 bg-[#f8f9fa]">
          <div className="border-b border-[#e0e0e0] bg-[#f8f9fa] p-6">
            <div className="mx-auto max-w-[1120px]">
              <div className="mx-auto aspect-video max-w-[960px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
                <div className="relative h-full w-full overflow-hidden bg-white">
                  <div className="absolute inset-0 px-[6%] py-[7%]">
                    <div
                      className="max-w-[72%] whitespace-pre-wrap break-words text-[#202124]"
                      style={{ fontFamily: 'Arial, sans-serif', fontSize: '28pt', fontWeight: 700, lineHeight: 1.2 }}
                    >
                      <RichText runs={activeSlide?.titleRuns} fallback={activeSlide?.title || 'Untitled slide'} />
                    </div>

                    <div className="mt-10 space-y-4">
                      {flowShapes.map((shape) => (
                        <div
                          key={`flow-shape-${shape.index}`}
                          className="whitespace-pre-wrap break-words rounded-sm border border-transparent px-1 py-0.5 text-[#202124]"
                          style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.25 }}
                        >
                          {shape.text || shape.runs?.length ? (
                            <RichText runs={shape.runs} fallback={shape.text || ''} />
                          ) : (
                            <span className="text-[#9aa0a6]">Empty text box</span>
                          )}
                        </div>
                      ))}

                      {flowShapes.length === 0 && positionedShapes.length === 0 ? (
                        <div className="pt-8 text-sm text-[#9aa0a6]">This slide has no editable text placeholders.</div>
                      ) : null}
                    </div>
                  </div>

                  {positionedShapes.map((shape) => (
                    <div
                      key={`positioned-shape-${shape.index}`}
                      className="absolute overflow-hidden whitespace-pre-wrap break-words px-2 py-1 text-[#202124]"
                      style={{
                        left: `${shape.left}%`,
                        top: `${shape.top}%`,
                        width: `${shape.width}%`,
                        height: `${shape.height}%`,
                        fontFamily: 'Arial, sans-serif',
                        lineHeight: 1.25,
                      }}
                    >
                      {shape.text || shape.runs?.length ? (
                        <RichText runs={shape.runs} fallback={shape.text || ''} />
                      ) : (
                        <span className="text-[#9aa0a6]">Empty text box</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6">
            <div className="mx-auto max-w-[1120px] rounded-xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
              <Input label="Slide title" value={activeSlide?.title ?? ''} onChange={(event) => updateTitle(event.target.value)} disabled={readOnly} />

              <div className="mt-5 space-y-3">
                {activeSlide?.shapes.length ? activeSlide.shapes.map((shape, index) => (
                  <div key={`shape-${shape.index}`} className="rounded-lg border border-[#e0e0e0] bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#5f6368]">{shape.name}</p>
                    <textarea
                      value={shape.text}
                      onChange={(event) => updateShapeText(index, event.target.value)}
                      readOnly={readOnly}
                      className="min-h-[120px] w-full resize-y rounded-md border border-[#dadce0] px-3 py-2 text-sm text-[#202124] outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 read-only:bg-[#f8f9fa]"
                    />
                  </div>
                )) : (
                  <div className="rounded-lg border border-dashed border-[#dadce0] bg-[#f8f9fa] px-4 py-6 text-sm text-[#5f6368]">
                    This slide has no editable text placeholders.
                  </div>
                )}
              </div>
            </div>
          </div>

          {readOnly && content.images && content.images.length > 0 ? (
            <div className="bg-white px-6 pb-6">
              <div className="mx-auto max-w-[1120px]">
                <EmbeddedImages images={content.images} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
