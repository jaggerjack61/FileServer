import { useMemo, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { ModeChip } from '@/components/files/office-editor/ModeChip';
import {
  buildMergeState,
  getCellLabel,
  getColumnLabel,
  getColumnWidthPx,
  getSheetDimensions,
  toCssColor,
  toPointSize,
} from '@/components/files/office-editor/utils';
import { cn } from '@/lib/utils';
import type { OfficeContent, OfficeSpreadsheetContent } from '@/types';

interface SpreadsheetEditorProps {
  content: OfficeSpreadsheetContent;
  onChange: (content: OfficeContent) => void;
  readOnly: boolean;
}

export function SpreadsheetEditor({ content, onChange, readOnly }: SpreadsheetEditorProps) {
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
    onChange({
      ...content,
      sheets: content.sheets.map((sheet, currentIndex) => (
        currentIndex === sheetIndex
          ? { ...sheet, name: nextName ?? sheet.name, rows: nextRows }
          : sheet
      )),
    });
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
    updateSheet(activeSheetIndex, baseRows.map((row) => [...row, '']));
  };

  const updateSheetName = (value: string) => {
    updateSheet(activeSheetIndex, (activeSheet?.rows ?? [['']]).map((row) => [...row]), value);
  };

  const activeValue = activeSheet?.rows?.[activeCell.row]?.[activeCell.col] ?? '';
  const tableMinWidth = 46 + columnWidths.reduce((total, width) => total + width, 0);

  return (
    <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/80">
      <div className="border-b border-gray-200 bg-gray-50/80 px-5 py-4 dark:border-white/10 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-slate-500">Grid Desk</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">Spreadsheet workspace</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ModeChip className="border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">{readOnly ? 'Viewing' : 'Editing'}</ModeChip>
            {!readOnly ? (
              <>
                <Button variant="secondary" size="sm" onClick={addRow}>Add Row</Button>
                <Button variant="secondary" size="sm" onClick={addColumn}>Add Column</Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900/70">
        <div className="flex items-center gap-0 overflow-hidden rounded-[18px] border border-gray-200 bg-white text-[13px] text-gray-700 shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
          <div className="flex h-11 min-w-[78px] items-center justify-center border-r border-gray-200 bg-gray-50 font-semibold dark:border-white/10 dark:bg-slate-900">
            {getCellLabel(activeCell.row, activeCell.col)}
          </div>
          <input
            value={activeValue}
            onChange={(event) => updateCell(activeCell.row, activeCell.col, event.target.value)}
            readOnly={readOnly}
            className="h-11 w-full border-0 bg-transparent px-3 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-slate-500"
            placeholder="Formula or value"
          />
        </div>
      </div>

      <div className="max-h-[66vh] overflow-auto bg-gray-50 p-4 dark:bg-slate-950/50">
        <div className="overflow-auto rounded-[22px] border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/80">
          <table className="border-collapse table-fixed" style={{ minWidth: `${tableMinWidth}px` }}>
            <colgroup>
              <col style={{ width: '46px' }} />
              {columnWidths.map((width, index) => (
                <col key={`column-width-${index}`} style={{ width: `${width}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="h-[24px] border-b border-r border-gray-200 bg-gray-50 px-2 text-right text-[12px] font-semibold text-gray-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-500" />
                {Array.from({ length: columnCount }).map((_, index) => (
                  <th key={`sheet-col-${index}`} className="h-[24px] border-b border-r border-gray-200 bg-gray-50 px-2 text-center text-[12px] font-semibold text-gray-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-500">
                    {getColumnLabel(index)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <tr key={`sheet-row-${rowIndex}`}>
                  <td className="h-[24px] border-b border-r border-gray-200 bg-gray-50 px-2 text-right text-[12px] text-gray-500 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-500">
                    {rowIndex + 1}
                  </td>
                  {Array.from({ length: columnCount }).map((_, colIndex) => {
                    const key = `${rowIndex},${colIndex}`;
                    if (readOnly && mergeState.covered.has(key)) {
                      return null;
                    }

                    const cellStyle = activeSheet?.cells?.[key];
                    const isActive = activeCell.row === rowIndex && activeCell.col === colIndex;
                    const mergeAnchor = readOnly ? mergeState.anchors[key] : undefined;

                    return (
                      <td
                        key={`sheet-cell-${rowIndex}-${colIndex}`}
                        rowSpan={mergeAnchor?.rowSpan}
                        colSpan={mergeAnchor?.colSpan}
                        className="border-b border-r border-gray-200 p-0 align-top dark:border-white/10"
                        style={isActive ? { boxShadow: 'inset 0 0 0 2px #2563eb' } : undefined}
                        onClick={() => setActiveCell({ row: rowIndex, col: colIndex })}
                      >
                        {readOnly ? (
                          <div
                            className="min-h-[24px] whitespace-pre-wrap px-2 py-1 text-[13px] leading-5 text-gray-800 dark:text-slate-200"
                            style={{
                              fontWeight: cellStyle?.bold ? 700 : 400,
                              fontStyle: cellStyle?.italic ? 'italic' : undefined,
                              color: toCssColor(cellStyle?.color) ?? '#1f2937',
                              backgroundColor: toCssColor(cellStyle?.bgColor) ?? '#ffffff',
                              fontSize: toPointSize(cellStyle?.fontSize) ?? '13px',
                              textAlign: (cellStyle?.align as 'left' | 'center' | 'right') ?? 'left',
                            }}
                          >
                            {activeSheet?.rows?.[rowIndex]?.[colIndex] ?? ''}
                          </div>
                        ) : (
                          <input
                            value={activeSheet?.rows?.[rowIndex]?.[colIndex] ?? ''}
                            onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                            onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
                            className="h-[24px] w-full border-0 bg-white px-2 text-[13px] text-gray-900 outline-none dark:bg-slate-900/80 dark:text-white"
                            style={{ textAlign: (cellStyle?.align as 'left' | 'center' | 'right') ?? 'left' }}
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

        <div className="mt-4 flex items-end gap-1 overflow-auto border-t border-gray-200 pt-2 dark:border-white/10">
          {content.sheets.map((sheet, index) => (
            <button
              key={`${sheet.name}-${index}`}
              type="button"
              onClick={() => {
                setActiveSheetIndex(index);
                setActiveCell({ row: 0, col: 0 });
              }}
              className={cn(
                'border-b-2 px-4 py-2 text-[13px] transition-colors',
                index === activeSheetIndex
                  ? 'border-blue-600 text-blue-700 dark:border-cyan-300 dark:text-cyan-300'
                  : 'border-transparent text-gray-500 hover:bg-white dark:text-slate-400 dark:hover:bg-white/5'
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
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-white dark:text-slate-300 dark:hover:bg-white/10"
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