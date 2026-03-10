import { EmbeddedImages } from '@/components/files/office-editor/EmbeddedImages';
import { RichText } from '@/components/files/office-editor/RichText';
import { getRichTextStyle } from '@/components/files/office-editor/utils';
import {
  getWordParagraphAppearance,
  getWordParagraphTextAlign,
  getWordBlocks,
} from '@/components/files/office-editor/word/wordUtils';
import type { CSSProperties } from 'react';
import type { OfficeWordContent, OfficeWordImageContentItem, OfficeWordParagraph, OfficeWordTable } from '@/types';

function getFloatingImageStyle(item: OfficeWordImageContentItem): CSSProperties {
  const translateX = typeof item.offsetX === 'number' ? Math.max(-160, Math.min(160, item.offsetX)) : 0;
  const translateY = typeof item.offsetY === 'number' ? Math.max(-72, Math.min(140, item.offsetY)) : 0;

  return {
    width: item.width ? `${item.width}px` : undefined,
    height: 'auto',
    transform: translateX || translateY ? `translate(${translateX}px, ${translateY}px)` : undefined,
  };
}

function getWordImageClassName(item: OfficeWordImageContentItem) {
  if (item.placement === 'floating') {
    if (item.wrap === 'topAndBottom' || item.wrap === 'none' || item.wrap === 'behindText') {
      return 'my-3 block max-w-full';
    }
    if (item.align === 'right') {
      return 'my-3 ml-auto block max-w-full';
    }
    if (item.align === 'center') {
      return 'my-3 mx-auto block max-w-full';
    }
    return 'my-3 mr-auto block max-w-full';
  }

  return item.placement === 'block'
    ? 'my-3 inline-block max-w-full align-middle'
    : 'mx-1 inline-block max-w-full align-middle';
}

function WordParagraphContent({ paragraph }: { paragraph: OfficeWordParagraph }) {
  if (!paragraph.content?.length) {
    const textContent = paragraph.text || '\u00A0';
    return <RichText runs={paragraph.runs} fallback={textContent} />;
  }

  return (
    <>
      {paragraph.content.map((item, index) => {
        if (item.type === 'image') {
          return (
            <img
              key={`word-paragraph-image-${index}`}
              src={item.dataUri}
              alt={item.altText || item.name || `Embedded image ${index + 1}`}
              className={getWordImageClassName(item)}
              style={getFloatingImageStyle(item)}
            />
          );
        }

        return (
          <span key={`word-paragraph-text-${index}`} style={getRichTextStyle(item)}>
            {item.text || ''}
          </span>
        );
      })}
    </>
  );
}

interface WordReadOnlyDocumentProps {
  content: OfficeWordContent;
}

function WordParagraphView({ paragraph }: { paragraph: OfficeWordParagraph }) {
  const appearance = getWordParagraphAppearance(paragraph.style);

  return (
    <p
      className="whitespace-pre-wrap break-words"
      style={{
        fontFamily: appearance.fontFamily,
        fontSize: `${appearance.fontSize}pt`,
        fontWeight: appearance.fontWeight,
        color: appearance.color,
        lineHeight: 1.35,
        marginBottom: `${appearance.marginBottom}px`,
        letterSpacing: appearance.letterSpacing,
        textTransform: appearance.textTransform,
        textAlign: getWordParagraphTextAlign(paragraph.alignment),
      }}
    >
      {appearance.prefix ? <span>{appearance.prefix}</span> : null}
      <WordParagraphContent paragraph={paragraph} />
    </p>
  );
}

function WordTableView({ table }: { table: OfficeWordTable }) {
  return (
    <div className="my-6 overflow-x-auto rounded-[18px] border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/80">
      <table className="w-full border-collapse">
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`table-row-${rowIndex}`}>
              {row.map((cell, colIndex) => (
                <td
                  key={`table-cell-${rowIndex}-${colIndex}`}
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

export function WordReadOnlyDocument({ content }: WordReadOnlyDocumentProps) {
  const blocks = getWordBlocks(content);

  return (
    <div className="space-y-0">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'table') {
          const table = content.tables?.[block.index];
          return table ? <WordTableView key={`word-block-table-${blockIndex}`} table={table} /> : null;
        }

        const paragraph = content.paragraphs[block.index];
        return paragraph ? <WordParagraphView key={`word-block-paragraph-${blockIndex}`} paragraph={paragraph} /> : null;
      })}

      {content.images?.length ? <EmbeddedImages images={content.images} /> : null}
    </div>
  );
}