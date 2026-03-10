import { useEffect, useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  ensureParagraphRuns,
  getWordParagraphAppearance,
  getWordParagraphMinHeight,
  paragraphTextFromRuns,
  WORD_ALIGNMENT_OPTIONS,
  WORD_PARAGRAPH_STYLES,
} from '@/components/files/office-editor/word/wordUtils';
import type { OfficeWordParagraph, OfficeWordRun } from '@/types';

interface WordParagraphCardProps {
  index: number;
  paragraph: OfficeWordParagraph;
  canRemove: boolean;
  onChange: (paragraph: OfficeWordParagraph) => void;
  onRemove: () => void;
  onAddParagraphAfter: () => void;
  onAddTableAfter: () => void;
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
        active
          ? 'border-blue-600 bg-blue-600 text-white dark:border-cyan-300 dark:bg-cyan-300 dark:text-slate-950'
          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-white/20'
      )}
    >
      {label}
    </button>
  );
}

function buildSingleRun(paragraph: OfficeWordParagraph, text: string): OfficeWordRun[] | undefined {
  if (!paragraph.runs?.length) {
    return undefined;
  }

  const seed = paragraph.runs[0];
  return [{ ...seed, text }];
}

export function WordParagraphCard({
  index,
  paragraph,
  canRemove,
  onChange,
  onRemove,
  onAddParagraphAfter,
  onAddTableAfter,
}: WordParagraphCardProps) {
  const [richMode, setRichMode] = useState(Boolean(paragraph.runs?.length));
  const appearance = getWordParagraphAppearance(paragraph.style);

  useEffect(() => {
    setRichMode(Boolean(paragraph.runs?.length));
  }, [index, paragraph.runs?.length]);

  const commitRuns = (runs: OfficeWordRun[]) => {
    onChange({
      ...paragraph,
      runs,
      text: paragraphTextFromRuns(runs),
    });
  };

  const updateRun = (runIndex: number, nextRun: OfficeWordRun) => {
    const runs = ensureParagraphRuns(paragraph).map((run, indexValue) => (indexValue === runIndex ? nextRun : run));
    commitRuns(runs);
  };

  const removeRun = (runIndex: number) => {
    const runs = ensureParagraphRuns(paragraph).filter((_, indexValue) => indexValue !== runIndex);
    commitRuns(runs.length ? runs : [{ text: '' }]);
  };

  const addRun = () => {
    commitRuns([...ensureParagraphRuns(paragraph), { text: '' }]);
  };

  return (
    <section className="rounded-[24px] border border-gray-200 bg-gray-50/70 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4 dark:border-white/10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-500">Paragraph {index + 1}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">Structured editing preserves untouched DOCX content and block order.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
            Style
            <select
              value={paragraph.style ?? ''}
              onChange={(event) => onChange({ ...paragraph, style: event.target.value || undefined })}
              className="ml-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
            >
              {WORD_PARAGRAPH_STYLES.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900">
            {WORD_ALIGNMENT_OPTIONS.map((option) => (
              <ToggleButton
                key={option.value}
                active={(paragraph.alignment ?? 'left') === option.value}
                label={option.label}
                onClick={() => onChange({ ...paragraph, alignment: option.value })}
              />
            ))}
          </div>

          <ToggleButton
            active={richMode}
            label={richMode ? 'Rich' : 'Plain'}
            onClick={() => {
              const nextRichMode = !richMode;
              setRichMode(nextRichMode);
              if (nextRichMode) {
                commitRuns(ensureParagraphRuns(paragraph));
              }
            }}
          />

          {canRemove ? (
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

      <div className="mt-4">
        {richMode ? (
          <div className="space-y-3">
            {ensureParagraphRuns(paragraph).map((run, runIndex) => (
              <div key={`paragraph-run-${runIndex}`} className="rounded-[18px] border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/80">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-500">Run {runIndex + 1}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <ToggleButton active={run.bold === true} label="B" onClick={() => updateRun(runIndex, { ...run, bold: !run.bold })} />
                    <ToggleButton active={run.italic === true} label="I" onClick={() => updateRun(runIndex, { ...run, italic: !run.italic })} />
                    <ToggleButton active={run.underline === true} label="U" onClick={() => updateRun(runIndex, { ...run, underline: !run.underline })} />
                    <input
                      type="number"
                      min={8}
                      max={48}
                      value={run.fontSize ?? ''}
                      onChange={(event) => updateRun(runIndex, {
                        ...run,
                        fontSize: event.target.value ? Number(event.target.value) : undefined,
                      })}
                      className="w-16 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
                      placeholder="pt"
                    />
                    <input
                      type="color"
                      value={run.color?.startsWith('#') ? run.color : `#${run.color ?? '2f261f'}`}
                      onChange={(event) => updateRun(runIndex, { ...run, color: event.target.value })}
                      className="h-9 w-11 rounded-full border border-gray-300 bg-white p-1 dark:border-white/10 dark:bg-slate-950"
                      aria-label={`Run ${runIndex + 1} color`}
                    />
                    {ensureParagraphRuns(paragraph).length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeRun(runIndex)}
                        className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:border-white/10 dark:text-slate-300"
                      >
                        Delete run
                      </button>
                    ) : null}
                  </div>
                </div>

                <textarea
                  value={run.text}
                  onChange={(event) => updateRun(runIndex, { ...run, text: event.target.value })}
                  className="min-h-[88px] w-full resize-y rounded-[14px] border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-cyan-300"
                  style={{
                    fontFamily: appearance.fontFamily,
                    fontSize: `${appearance.fontSize}pt`,
                    fontWeight: run.bold ? 700 : appearance.fontWeight,
                    fontStyle: run.italic ? 'italic' : 'normal',
                  }}
                  placeholder="Run content"
                />
              </div>
            ))}

            <Button variant="secondary" size="sm" onClick={addRun}>
              <PlusIcon className="h-4 w-4" />
              Add Run
            </Button>
          </div>
        ) : (
          <textarea
            value={paragraph.text}
            onChange={(event) => onChange({
              ...paragraph,
              text: event.target.value,
              runs: buildSingleRun(paragraph, event.target.value),
            })}
            className="w-full resize-y border-0 bg-transparent px-0 py-0 text-gray-900 outline-none focus:ring-0 dark:text-white"
            style={{
              minHeight: `${getWordParagraphMinHeight(paragraph.style)}px`,
              fontFamily: appearance.fontFamily,
              fontSize: `${appearance.fontSize}pt`,
              fontWeight: appearance.fontWeight,
              lineHeight: 1.35,
              color: appearance.color,
              textAlign: paragraph.alignment ?? 'left',
              letterSpacing: appearance.letterSpacing,
              textTransform: appearance.textTransform,
            }}
            placeholder="Start writing"
          />
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
        <Button variant="secondary" size="sm" onClick={onAddParagraphAfter}>
          <PlusIcon className="h-4 w-4" />
          Paragraph Below
        </Button>
        <Button variant="secondary" size="sm" onClick={onAddTableAfter}>
          <PlusIcon className="h-4 w-4" />
          Table Below
        </Button>
      </div>
    </section>
  );
}