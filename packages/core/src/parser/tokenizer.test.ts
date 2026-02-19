import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer.js';

describe('tokenize', () => {
  it('parses basic code/value pairs', () => {
    const tokens = tokenize('  0\nSECTION\n  2\nHEADER\n');
    expect(tokens).toEqual([
      { code: 0, value: 'SECTION' },
      { code: 2, value: 'HEADER' },
    ]);
  });

  it('handles \\r\\n line endings', () => {
    const tokens = tokenize('  0\r\nSECTION\r\n  2\r\nHEADER\r\n');
    expect(tokens).toEqual([
      { code: 0, value: 'SECTION' },
      { code: 2, value: 'HEADER' },
    ]);
  });

  it('handles \\r line endings', () => {
    const tokens = tokenize('  0\rSECTION\r  2\rHEADER\r');
    expect(tokens).toEqual([
      { code: 0, value: 'SECTION' },
      { code: 2, value: 'HEADER' },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(tokenize('\n\n\n')).toEqual([]);
  });

  it('skips malformed (NaN) group codes', () => {
    const tokens = tokenize('  0\nSECTION\nabc\nskipped\n  2\nHEADER\n');
    expect(tokens).toEqual([
      { code: 0, value: 'SECTION' },
      { code: 2, value: 'HEADER' },
    ]);
  });

  it('preserves leading spaces in values', () => {
    const tokens = tokenize('  1\n  Hello World\n');
    expect(tokens).toEqual([{ code: 1, value: '  Hello World' }]);
  });

  it('strips trailing whitespace from values', () => {
    const tokens = tokenize('  1\nHello   \n');
    expect(tokens).toEqual([{ code: 1, value: 'Hello' }]);
  });

  it('trims group code lines (both sides)', () => {
    const tokens = tokenize('   0  \nEOF\n');
    expect(tokens).toEqual([{ code: 0, value: 'EOF' }]);
  });

  it('handles EOF without trailing newline', () => {
    const tokens = tokenize('  0\nEOF');
    expect(tokens).toEqual([{ code: 0, value: 'EOF' }]);
  });

  it('handles premature EOF after code line (no value line)', () => {
    const tokens = tokenize('  0\nSECTION\n  2');
    // code 2 is read but value line is missing — should break
    expect(tokens).toEqual([{ code: 0, value: 'SECTION' }]);
  });

  it('skips leading empty lines before code lines', () => {
    // The tokenizer skips empty lines before a code line,
    // but code/value are strict consecutive line pairs.
    // Empty lines between code and value would be consumed as the value.
    const tokens = tokenize('\n\n  0\nSECTION\n\n\n  0\nEOF\n');
    expect(tokens).toEqual([
      { code: 0, value: 'SECTION' },
      { code: 0, value: 'EOF' },
    ]);
  });

  it('parses numeric values as strings', () => {
    const tokens = tokenize(' 10\n42.5\n 20\n-10.0\n');
    expect(tokens).toEqual([
      { code: 10, value: '42.5' },
      { code: 20, value: '-10.0' },
    ]);
  });
});
