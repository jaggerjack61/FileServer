import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { PlusIcon, RectangleGroupIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { ModeChip } from '@/components/files/office-editor/ModeChip';
import { EmbeddedImages } from '@/components/files/office-editor/EmbeddedImages';
import { WordReadOnlyDocument } from '@/components/files/office-editor/word/WordReadOnlyDocument';
import { WordTableEditor } from '@/components/files/office-editor/word/WordTableEditor';
import {
  addParagraph,
  addTable,
  getWordParagraphAppearance,
  getWordParagraphMinHeight,
  getWordBlocks,
  getWordParagraphTextAlign,
  removeParagraph,
  removeTable,
  replaceParagraph,
  replaceTable,
  setParagraphPlainText,
  WORD_ALIGNMENT_OPTIONS,
  WORD_PARAGRAPH_STYLES,
} from '@/components/files/office-editor/word/wordUtils';
import { cn } from '@/lib/utils';
import type { OfficeContent, OfficeWordContent } from '@/types';

interface WordEditorProps {
  content: OfficeWordContent;
  onChange: (content: OfficeContent) => void;
  readOnly: boolean;
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
        active
          ? 'border-sky-700 bg-sky-700 text-white dark:border-cyan-300 dark:bg-cyan-300 dark:text-slate-950'
          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-white/20'
      )}
    >
      {label}
    </button>
  );
}

interface WordFlowParagraphEditorProps {
  blockIndex: number;
  paragraphIndex: number;
  paragraphText: string;
  paragraphStyle?: string;
  paragraphAlignment?: 'left' | 'center' | 'right' | 'justify';
  isActive: boolean;
  onFocus: (blockIndex: number, paragraphIndex: number) => void;
  onChangeText: (paragraphIndex: number, nextText: string) => void;
  onSplit: (blockIndex: number, paragraphIndex: number, selectionStart: number, selectionEnd: number) => void;
  onMergeWithPrevious: (blockIndex: number, paragraphIndex: number) => boolean;
  registerTextarea: (paragraphIndex: number, node: HTMLTextAreaElement | null) => void;
}

function WordFlowParagraphEditor({
  blockIndex,
  paragraphIndex,
  paragraphText,
  paragraphStyle,
  paragraphAlignment,
  isActive,
  onFocus,
  onChangeText,
  onSplit,
  onMergeWithPrevious,
  registerTextarea,
}: WordFlowParagraphEditorProps) {
  const appearance = getWordParagraphAppearance(paragraphStyle);

  useEffect(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>(`textarea[data-word-paragraph="${paragraphIndex}"]`);
    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';
    textarea.style.height = `${Math.max(textarea.scrollHeight, getWordParagraphMinHeight(paragraphStyle))}px`;
  }, [paragraphIndex, paragraphStyle, paragraphText]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const selectionStart = event.currentTarget.selectionStart ?? paragraphText.length;
    const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSplit(blockIndex, paragraphIndex, selectionStart, selectionEnd);
      return;
    }

    if (
      event.key === 'Backspace'
      && selectionStart === 0
      && selectionEnd === 0
      && !event.altKey
      && !event.ctrlKey
      && !event.metaKey
      && onMergeWithPrevious(blockIndex, paragraphIndex)
    ) {
      event.preventDefault();
    }
  };

  return (
    <div
      className={cn(
        'group relative -mx-3 rounded-[18px] px-3 py-2 transition-colors',
        isActive ? 'bg-amber-50/70 ring-1 ring-amber-200' : 'hover:bg-gray-50/80'
      )}
      onMouseDownCapture={() => onFocus(blockIndex, paragraphIndex)}
    >
      <div className="flex items-start gap-2">
        {appearance.prefix ? (
          <span
            className="pt-0.5 text-gray-700"
            style={{
              fontFamily: appearance.fontFamily,
              fontSize: `${appearance.fontSize}pt`,
              fontWeight: appearance.fontWeight,
              lineHeight: 1.35,
            }}
          >
            {appearance.prefix.trim()}
          </span>
        ) : null}

        <textarea
          data-word-paragraph={paragraphIndex}
          ref={(node) => registerTextarea(paragraphIndex, node)}
          value={paragraphText}
          onFocus={() => onFocus(blockIndex, paragraphIndex)}
          onChange={(event) => onChangeText(paragraphIndex, event.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full resize-none overflow-hidden border-0 bg-transparent px-0 py-0 text-gray-900 outline-none focus:ring-0"
          style={{
            minHeight: `${getWordParagraphMinHeight(paragraphStyle)}px`,
            fontFamily: appearance.fontFamily,
            fontSize: `${appearance.fontSize}pt`,
            fontWeight: appearance.fontWeight,
            lineHeight: 1.35,
            color: appearance.color,
            textAlign: getWordParagraphTextAlign(paragraphAlignment),
            letterSpacing: appearance.letterSpacing,
            textTransform: appearance.textTransform,
          }}
          placeholder="Start writing"
          spellCheck
        />
      </div>
    </div>
  );
}

export function WordEditor({ content, onChange, readOnly }: WordEditorProps) {
  const blocks = getWordBlocks(content);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(content.paragraphs[0] ? 0 : null);
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const pendingFocusRef = useRef<{ paragraphIndex: number; caret: number } | null>(null);

  useEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) {
      return;
    }

    const node = textareaRefs.current[pendingFocus.paragraphIndex];
    if (!node) {
      return;
    }

    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(pendingFocus.caret, pendingFocus.caret);
    });

    pendingFocusRef.current = null;
  }, [content]);

  const activeParagraph = activeParagraphIndex === null ? null : content.paragraphs[activeParagraphIndex] ?? null;

  const focusParagraph = (blockIndex: number, paragraphIndex: number) => {
    setActiveBlockIndex(blockIndex);
    setActiveParagraphIndex(paragraphIndex);
  };

  const queueFocus = (paragraphIndex: number, caret: number) => {
    pendingFocusRef.current = { paragraphIndex, caret };
    setActiveParagraphIndex(paragraphIndex);
  };

  const updateParagraphText = (paragraphIndex: number, nextText: string) => {
    const paragraph = content.paragraphs[paragraphIndex];
    if (!paragraph) {
      return;
    }

    onChange(replaceParagraph(content, paragraphIndex, setParagraphPlainText(paragraph, nextText)));
  };

  const insertParagraphAfterActiveBlock = () => {
    const nextParagraphIndex = content.paragraphs.length;
    queueFocus(nextParagraphIndex, 0);
    onChange(addParagraph(content, activeBlockIndex));
  };

  const splitParagraph = (blockIndex: number, paragraphIndex: number, selectionStart: number, selectionEnd: number) => {
    const paragraph = content.paragraphs[paragraphIndex];
    if (!paragraph) {
      return;
    }

    const currentText = paragraph.text || '';
    const currentSelectionStart = Math.max(0, Math.min(currentText.length, selectionStart));
    const currentSelectionEnd = Math.max(currentSelectionStart, Math.min(currentText.length, selectionEnd));
    const beforeText = currentText.slice(0, currentSelectionStart);
    const afterText = currentText.slice(currentSelectionEnd);
    const nextParagraphIndex = content.paragraphs.length;

    let nextContent = replaceParagraph(content, paragraphIndex, setParagraphPlainText(paragraph, beforeText));
    nextContent = addParagraph(nextContent, blockIndex);
    nextContent = replaceParagraph(
      nextContent,
      nextParagraphIndex,
      setParagraphPlainText(
        {
          ...paragraph,
          text: '',
          runs: paragraph.runs?.length ? [{ ...paragraph.runs[0], text: '' }] : undefined,
        },
        afterText,
      ),
    );

    queueFocus(nextParagraphIndex, 0);
    onChange(nextContent);
  };

  const mergeWithPreviousParagraph = (blockIndex: number, paragraphIndex: number) => {
    const previousBlock = [...blocks].slice(0, blockIndex).reverse().find((block) => block.type === 'paragraph');
    if (!previousBlock) {
      return false;
    }

    const previousParagraph = content.paragraphs[previousBlock.index];
    const currentParagraph = content.paragraphs[paragraphIndex];
    if (!previousParagraph || !currentParagraph) {
      return false;
    }

    const mergedText = `${previousParagraph.text || ''}${currentParagraph.text || ''}`;
    let nextContent = replaceParagraph(content, previousBlock.index, setParagraphPlainText(previousParagraph, mergedText));
    nextContent = removeParagraph(nextContent, paragraphIndex);

    const focusIndex = previousBlock.index > paragraphIndex ? previousBlock.index - 1 : previousBlock.index;
    queueFocus(focusIndex, previousParagraph.text?.length ?? 0);
    onChange(nextContent);
    return true;
  };

  const removeActiveParagraph = () => {
    if (activeParagraphIndex === null || content.paragraphs.length <= 1) {
      return;
    }

    const fallbackParagraphIndex = activeParagraphIndex > 0 ? activeParagraphIndex - 1 : 0;
    queueFocus(fallbackParagraphIndex, content.paragraphs[fallbackParagraphIndex]?.text?.length ?? 0);
    onChange(removeParagraph(content, activeParagraphIndex));
  };

  const updateActiveParagraph = (updates: Partial<NonNullable<typeof activeParagraph>>) => {
    if (activeParagraphIndex === null || !activeParagraph) {
      return;
    }

    onChange(replaceParagraph(content, activeParagraphIndex, { ...activeParagraph, ...updates }));
  };

  return (
    <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100">
      <div className="border-b border-gray-200 bg-gray-50/80 px-5 py-4 sm:px-6 dark:border-white/10 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-slate-500">Document Studio</p>
            <h2 className="mt-1 font-[Georgia] text-xl font-semibold text-gray-900 dark:text-white">
              {readOnly ? 'Preserved DOCX viewer' : 'Continuous Word editing'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-400">
              Paragraphs still round-trip through python-docx, but editing now happens on a flowing page instead of isolated paragraph cards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ModeChip className="border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
              {readOnly ? 'Viewing' : 'Editing'}
            </ModeChip>
            <ModeChip className="border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
              {content.paragraphs.length} paragraph{content.paragraphs.length === 1 ? '' : 's'}
            </ModeChip>
            <ModeChip className="border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
              {content.tables?.length ?? 0} table{(content.tables?.length ?? 0) === 1 ? '' : 's'}
            </ModeChip>
            {!readOnly ? (
              <>
                <Button variant="secondary" size="sm" onClick={insertParagraphAfterActiveBlock}>
                  <PlusIcon className="h-4 w-4" />
                  Paragraph
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onChange(addTable(content, activeBlockIndex))}>
                  <RectangleGroupIcon className="h-4 w-4" />
                  Table
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {!readOnly ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
            <p className="mr-2 text-xs text-gray-500 dark:text-slate-400">Enter creates a new paragraph. Shift+Enter keeps a line break.</p>

            {activeParagraph ? (
              <>
                <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
                  Style
                  <select
                    value={activeParagraph.style ?? ''}
                    onChange={(event) => updateActiveParagraph({ style: event.target.value || undefined })}
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
                      active={(activeParagraph.alignment ?? 'left') === option.value}
                      label={option.label}
                      onClick={() => updateActiveParagraph({ alignment: option.value })}
                    />
                  ))}
                </div>

                {content.paragraphs.length > 1 ? (
                  <button
                    type="button"
                    onClick={removeActiveParagraph}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Remove Paragraph
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="max-h-[72vh] overflow-auto bg-gray-50 p-4 sm:p-6 dark:bg-slate-950/60">
        <div className="mx-auto max-w-[920px] rounded-[28px] border border-gray-200 bg-white px-5 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:px-10 sm:py-10 dark:border-white/10 dark:bg-white">
          {readOnly ? (
            <WordReadOnlyDocument content={content} />
          ) : (
            <div className="space-y-0">
              {blocks.map((block, blockIndex) => {
                if (block.type === 'table') {
                  const table = content.tables?.[block.index];
                  return table ? (
                    <div key={`word-edit-table-${blockIndex}`} onMouseDownCapture={() => setActiveBlockIndex(blockIndex)}>
                      <WordTableEditor
                        index={block.index}
                        table={table}
                        onChange={(nextTable) => onChange(replaceTable(content, block.index, nextTable))}
                        onRemove={() => onChange(removeTable(content, block.index))}
                        onAddParagraphAfter={() => onChange(addParagraph(content, blockIndex))}
                        onAddTableAfter={() => onChange(addTable(content, blockIndex))}
                      />
                    </div>
                  ) : null;
                }

                const paragraph = content.paragraphs[block.index];
                return paragraph ? (
                  <WordFlowParagraphEditor
                    key={`word-edit-paragraph-${blockIndex}`}
                    blockIndex={blockIndex}
                    paragraphIndex={block.index}
                    paragraphText={paragraph.text || ''}
                    paragraphStyle={paragraph.style}
                    paragraphAlignment={paragraph.alignment}
                    isActive={activeParagraphIndex === block.index}
                    onFocus={focusParagraph}
                    onChangeText={updateParagraphText}
                    onSplit={splitParagraph}
                    onMergeWithPrevious={mergeWithPreviousParagraph}
                    registerTextarea={(paragraphIndex, node) => {
                      textareaRefs.current[paragraphIndex] = node;
                    }}
                  />
                ) : null;
              })}

              {content.images?.length ? (
                <EmbeddedImages
                  images={content.images}
                  caption="Images are still pass-through assets in this editor, but they now survive open/save cycles."
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}