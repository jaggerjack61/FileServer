import type { CSSProperties } from 'react';
import type {
  OfficeWordBlock,
  OfficeWordContent,
  OfficeWordParagraph,
  OfficeWordRun,
  OfficeWordTable,
} from '@/types';

export const WORD_PARAGRAPH_STYLES = [
  { value: '', label: 'Body' },
  { value: 'title', label: 'Title' },
  { value: 'subtitle', label: 'Subtitle' },
  { value: 'heading1', label: 'Heading 1' },
  { value: 'heading2', label: 'Heading 2' },
  { value: 'heading3', label: 'Heading 3' },
  { value: 'heading4', label: 'Heading 4' },
  { value: 'list', label: 'Bullet' },
] as const;

export const WORD_ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'L' },
  { value: 'center', label: 'C' },
  { value: 'right', label: 'R' },
  { value: 'justify', label: 'J' },
] as const;

interface WordParagraphAppearance {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  marginBottom: number;
  prefix?: string;
  textTransform?: CSSProperties['textTransform'];
  letterSpacing?: string;
}

export function getWordParagraphAppearance(style?: string): WordParagraphAppearance {
  switch (style) {
    case 'title':
      return {
        fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
        fontSize: 28,
        fontWeight: 500,
        color: '#111827',
        marginBottom: 18,
        letterSpacing: '-0.02em',
      };
    case 'subtitle':
      return {
        fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
        fontSize: 15,
        fontWeight: 400,
        color: '#6b7280',
        marginBottom: 18,
      };
    case 'heading1':
      return {
        fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
        fontSize: 22,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 16,
      };
    case 'heading2':
      return {
        fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
        fontSize: 18,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 14,
      };
    case 'heading3':
      return {
        fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
        fontSize: 15,
        fontWeight: 700,
        color: '#374151',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      };
    case 'heading4':
      return {
        fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
        fontSize: 13,
        fontWeight: 700,
        color: '#374151',
        marginBottom: 10,
      };
    case 'list':
      return {
        fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
        fontSize: 12,
        fontWeight: 400,
        color: '#1f2937',
        marginBottom: 8,
        prefix: '• ',
      };
    default:
      return {
        fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
        fontSize: 12,
        fontWeight: 400,
        color: '#1f2937',
        marginBottom: 10,
      };
  }
}

export function getWordParagraphMinHeight(style?: string) {
  switch (style) {
    case 'title':
      return 52;
    case 'heading1':
      return 42;
    case 'heading2':
      return 36;
    default:
      return 30;
  }
}

export function getWordParagraphTextAlign(alignment?: OfficeWordParagraph['alignment']): CSSProperties['textAlign'] {
  return alignment ?? 'left';
}

export function paragraphTextFromRuns(runs?: OfficeWordRun[]) {
  return runs?.map((run) => run.text || '').join('') ?? '';
}

export function ensureParagraphRuns(paragraph: OfficeWordParagraph): OfficeWordRun[] {
  if (paragraph.runs?.length) {
    return paragraph.runs;
  }

  return [{ text: paragraph.text || '' }];
}

export function createEmptyParagraph(): OfficeWordParagraph {
  return { text: '' };
}

export function setParagraphPlainText(paragraph: OfficeWordParagraph, text: string): OfficeWordParagraph {
  if (!paragraph.runs?.length) {
    return {
      ...paragraph,
      text,
    };
  }

  const seed = paragraph.runs[0];
  return {
    ...paragraph,
    text,
    runs: [{ ...seed, text }],
  };
}

export function createEmptyTable(columnCount = 3, rowCount = 2): OfficeWordTable {
  return {
    rows: Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => ({ text: '' }))),
  };
}

export function getWordBlocks(content: OfficeWordContent): OfficeWordBlock[] {
  if (content.blocks?.length) {
    return content.blocks;
  }

  return [
    ...content.paragraphs.map((_, index) => ({ type: 'paragraph' as const, index })),
    ...(content.tables?.map((_, index) => ({ type: 'table' as const, index })) ?? []),
  ];
}

function insertBlock(blocks: OfficeWordBlock[], block: OfficeWordBlock, insertAfterBlockIndex?: number) {
  if (typeof insertAfterBlockIndex !== 'number' || insertAfterBlockIndex < 0) {
    return [...blocks, block];
  }

  const nextBlocks = [...blocks];
  nextBlocks.splice(insertAfterBlockIndex + 1, 0, block);
  return nextBlocks;
}

export function replaceParagraph(content: OfficeWordContent, index: number, paragraph: OfficeWordParagraph): OfficeWordContent {
  return {
    ...content,
    paragraphs: content.paragraphs.map((item, itemIndex) => (itemIndex === index ? paragraph : item)),
  };
}

export function replaceTable(content: OfficeWordContent, index: number, table: OfficeWordTable): OfficeWordContent {
  return {
    ...content,
    tables: (content.tables ?? []).map((item, itemIndex) => (itemIndex === index ? table : item)),
  };
}

export function addParagraph(content: OfficeWordContent, insertAfterBlockIndex?: number): OfficeWordContent {
  const nextParagraphIndex = content.paragraphs.length;
  const nextBlocks = insertBlock(getWordBlocks(content), { type: 'paragraph', index: nextParagraphIndex }, insertAfterBlockIndex);

  return {
    ...content,
    paragraphs: [...content.paragraphs, createEmptyParagraph()],
    blocks: nextBlocks,
  };
}

export function addTable(content: OfficeWordContent, insertAfterBlockIndex?: number): OfficeWordContent {
  const tables = content.tables ?? [];
  const nextTableIndex = tables.length;
  const nextBlocks = insertBlock(getWordBlocks(content), { type: 'table', index: nextTableIndex }, insertAfterBlockIndex);

  return {
    ...content,
    tables: [...tables, createEmptyTable()],
    blocks: nextBlocks,
  };
}

export function removeParagraph(content: OfficeWordContent, paragraphIndex: number): OfficeWordContent {
  let nextParagraphs = content.paragraphs.filter((_, index) => index !== paragraphIndex);
  let nextBlocks = getWordBlocks(content)
    .filter((block) => !(block.type === 'paragraph' && block.index === paragraphIndex))
    .map((block) => (
      block.type === 'paragraph' && block.index > paragraphIndex
        ? { ...block, index: block.index - 1 }
        : block
    ));

  if (!nextParagraphs.length) {
    nextParagraphs = [createEmptyParagraph()];
    nextBlocks = [{ type: 'paragraph', index: 0 }, ...nextBlocks];
  }

  if (!nextBlocks.length) {
    nextBlocks = [{ type: 'paragraph', index: 0 }];
  }

  return {
    ...content,
    paragraphs: nextParagraphs,
    blocks: nextBlocks,
  };
}

export function removeTable(content: OfficeWordContent, tableIndex: number): OfficeWordContent {
  const nextTables = (content.tables ?? []).filter((_, index) => index !== tableIndex);
  let nextBlocks = getWordBlocks(content)
    .filter((block) => !(block.type === 'table' && block.index === tableIndex))
    .map((block) => (
      block.type === 'table' && block.index > tableIndex
        ? { ...block, index: block.index - 1 }
        : block
    ));

  if (!nextBlocks.length) {
    nextBlocks = [{ type: 'paragraph', index: 0 }];
  }

  return {
    ...content,
    tables: nextTables,
    blocks: nextBlocks,
  };
}