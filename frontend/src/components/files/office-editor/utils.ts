import type { CSSProperties } from 'react';
import type {
  OfficePresentationRun,
  OfficePresentationShape,
  OfficeSpreadsheetSheet,
  OfficeWordRun,
} from '@/types';

export type RichTextRun = OfficeWordRun | OfficePresentationRun;

export interface MergeAnchor {
  rowSpan: number;
  colSpan: number;
}

export function getColumnLabel(index: number): string {
  let current = index + 1;
  let result = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

export function getCellLabel(row: number, col: number): string {
  return `${getColumnLabel(col)}${row + 1}`;
}

export function toCssColor(color?: string): string | undefined {
  if (!color) {
    return undefined;
  }

  return color.startsWith('#') ? color : `#${color}`;
}

export function toPointSize(value?: number): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}pt` : undefined;
}

export function getSheetDimensions(sheet?: OfficeSpreadsheetSheet) {
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

export function buildMergeState(mergedCells?: number[][]) {
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

export function getColumnWidthPx(sheet: OfficeSpreadsheetSheet | undefined, columnIndex: number) {
  const width = sheet?.columnWidths?.[columnIndex];
  if (typeof width !== 'number' || !Number.isFinite(width)) {
    return 110;
  }
  return Math.max(48, Math.round(width * 7.5));
}

export function isPositionedShape(shape: OfficePresentationShape) {
  return [shape.left, shape.top, shape.width, shape.height].every(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );
}

export function getSlidePreviewText(shape: OfficePresentationShape) {
  const fromRuns = shape.runs?.map((run) => run.text).join('');
  return (fromRuns || shape.text || '').replace(/\s+/g, ' ').trim();
}

export function getRichTextStyle(run: RichTextRun): CSSProperties {
  return {
    fontWeight: run.bold ? 700 : undefined,
    fontStyle: run.italic ? 'italic' : undefined,
    textDecoration: 'underline' in run && run.underline ? 'underline' : undefined,
    fontSize: toPointSize(run.fontSize),
    color: toCssColor(run.color),
  };
}