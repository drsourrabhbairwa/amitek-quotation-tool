import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LetterheadHeader } from './LetterheadHeader';
import { DIVISIONS } from '../../lib/constants';

const render = (props) => renderToStaticMarkup(<LetterheadHeader div={DIVISIONS.sf} letterhead={{}} date="16-11-2026" editable={false} onDateChange={() => {}} {...props} />);

describe('LetterheadHeader revision label', () => {
  it('prints (Rev N) next to the Ref No once a quotation has been revised', () => {
    expect(render({ refNo: 'AMK/QTN/SF/2026/009', revision: 2 })).toContain('AMK/QTN/SF/2026/009 (Rev 2)');
  });
  it('prints no Rev label on the original version', () => {
    expect(render({ refNo: 'AMK/QTN/SF/2026/009', revision: 0 })).not.toContain('Rev');
  });
});
