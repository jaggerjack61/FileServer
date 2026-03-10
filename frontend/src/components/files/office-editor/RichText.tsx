import { Fragment } from 'react';
import { getRichTextStyle, type RichTextRun } from '@/components/files/office-editor/utils';

interface RichTextProps {
  runs?: RichTextRun[];
  fallback: string;
}

export function RichText({ runs, fallback }: RichTextProps) {
  const normalizedRuns = runs && runs.length > 0 ? runs : [{ text: fallback }];

  return (
    <>
      {normalizedRuns.map((run, index) => (
        <Fragment key={`run-${index}`}>
          <span style={getRichTextStyle(run)}>{run.text || ''}</span>
        </Fragment>
      ))}
    </>
  );
}