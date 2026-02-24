import { describe, expect, it } from 'vitest';
import { classifyAwardMode, parseAmountInput } from './filters';

describe('filters utils', () => {
  it('detects direct award in greek', () => {
    const mode = classifyAwardMode({ procedureType: 'ΑΠΕΥΘΕΙΑΣ ΑΝΑΘΕΣΗ' });
    expect(mode).toBe('direct');
  });

  it('parses amount with greek separators', () => {
    expect(parseAmountInput('12.345,67')).toBe(12345.67);
  });
});

