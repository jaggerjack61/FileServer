import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { RichText } from '@/components/files/office-editor/RichText';
import type { OfficeWordTable } from '@/types';

interface WordTableEditorProps {
  index: number;
  table: OfficeWordTable;
  readOnly?: boolean;
  onChange?: (table: OfficeWordTable) => void;
  onRemove?: () => void;
  onAddParagraphAfter?: () => void;
  onAddTableAfter?: () => void;
}

function normalizeTable(table: OfficeWordTable): OfficeWordTable {
  const rowCount = Math.max(1, table.rows.length);
  const columnCount = Math.max(1, ...table.rows.map((row) => row.length), 1);

  return {
    rows: Array.from({ length: rowCount }, (_, rowIndex) =>
      Array.from({ length: columnCount }, (_, colIndex) => table.rows[rowIndex]?.[colIndex] ?? { text: '' })
    ),
  };
}

export function WordTableEditor({
  index,
  table,
  readOnly = false,
  onChange,
  onRemove,
  onAddParagraphAfter,
  onAddTableAfter,
}: WordTableEditorProps) {
  const normalizedTable = normalizeTable(table);

  if (readOnly) {
    return (
      <div className="my-6 overflow-x-auto rounded-[18px] border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/80">
        <table className="w-full border-collapse">
          <tbody>
            {normalizedTable.rows.map((row, rowIndex) => (
              <tr key={`read-table-row-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <td
                    key={`read-table-cell-${rowIndex}-${colIndex}`}
                    className="border border-gray-200 px-4 py-3 align-top text-gray-800 dark:border-white/10 dark:text-slate-200"
                    style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', lineHeight: 1.35 }}
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

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    if (!onChange) {
      return;
    }

    const nextRows = normalizedTable.rows.map((row) => row.map((cell) => ({ ...cell })));
    nextRows[rowIndex][colIndex] = { ...nextRows[rowIndex][colIndex], text: value, runs: undefined };
    onChange({ rows: nextRows });
  };

  const addRow = () => {
    if (!onChange) {
      return;
    }

    onChange({
      rows: [...normalizedTable.rows.map((row) => [...row]), Array.from({ length: normalizedTable.rows[0].length }, () => ({ text: '' }))],
    });
  };

  const addColumn = () => {
    if (!onChange) {
      return;
    }

    onChange({
      rows: normalizedTable.rows.map((row) => [...row, { text: '' }]),
    });
  };

  const removeRow = () => {
    if (!onChange || normalizedTable.rows.length <= 1) {
      return;
    }
    onChange({ rows: normalizedTable.rows.slice(0, -1) });
  };

  const removeColumn = () => {
    if (!onChange || normalizedTable.rows[0].length <= 1) {
      return;
    }
    onChange({ rows: normalizedTable.rows.map((row) => row.slice(0, -1)) });
  };

  return (
    <section className="rounded-[24px] border border-gray-200 bg-gray-50/70 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4 dark:border-white/10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500">Table {index + 1}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">Editable grid writes back to DOCX tables instead of dropping them on save.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={addRow}>
            <PlusIcon className="h-4 w-4" />
            Row
          </Button>
          <Button variant="secondary" size="sm" onClick={addColumn}>
            <PlusIcon className="h-4 w-4" />
            Column
          </Button>
          <Button variant="secondary" size="sm" onClick={removeRow}>
            Trim Row
          </Button>
          <Button variant="secondary" size="sm" onClick={removeColumn}>
            Trim Column
          </Button>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
            >
              <TrashIcon className="h-4 w-4" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse overflow-hidden rounded-[18px] border border-gray-200 bg-white dark:border-white/10 dark:bg-slate-900/80">
          <tbody>
            {normalizedTable.rows.map((row, rowIndex) => (
              <tr key={`edit-table-row-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <td key={`edit-table-cell-${rowIndex}-${colIndex}`} className="border border-gray-200 p-0 align-top dark:border-white/10">
                    <textarea
                      value={cell.text}
                      onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                      className="min-h-[96px] w-full resize-y border-0 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none focus:bg-gray-50 dark:text-white dark:focus:bg-slate-950/60"
                      style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', lineHeight: 1.35 }}
                      placeholder={`Cell ${rowIndex + 1}, ${colIndex + 1}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
        {onAddParagraphAfter ? (
          <Button variant="secondary" size="sm" onClick={onAddParagraphAfter}>
            <PlusIcon className="h-4 w-4" />
            Paragraph Below
          </Button>
        ) : null}
        {onAddTableAfter ? (
          <Button variant="secondary" size="sm" onClick={onAddTableAfter}>
            <PlusIcon className="h-4 w-4" />
            Table Below
          </Button>
        ) : null}
      </div>
    </section>
  );
}