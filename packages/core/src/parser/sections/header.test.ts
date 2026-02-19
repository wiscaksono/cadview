import { describe, it, expect } from 'vitest';
import { parseHeader } from './header.js';
import type { DxfToken } from '../tokenizer.js';
import type { DxfHeader } from '../types.js';

function makeHeader(): DxfHeader {
  return {
    acadVersion: '',
    insUnits: 0,
    measurement: 0,
    ltScale: 1,
  };
}

describe('parseHeader', () => {
  it('parses $ACADVER', () => {
    const tokens: DxfToken[] = [
      { code: 9, value: '$ACADVER' },
      { code: 1, value: 'AC1027' },
      { code: 0, value: 'ENDSEC' },
    ];
    const header = makeHeader();
    parseHeader(tokens, 0, header);
    expect(header.acadVersion).toBe('AC1027');
  });

  it('parses $INSUNITS', () => {
    const tokens: DxfToken[] = [
      { code: 9, value: '$INSUNITS' },
      { code: 70, value: '4' },
      { code: 0, value: 'ENDSEC' },
    ];
    const header = makeHeader();
    parseHeader(tokens, 0, header);
    expect(header.insUnits).toBe(4);
  });

  it('parses $MEASUREMENT', () => {
    const tokens: DxfToken[] = [
      { code: 9, value: '$MEASUREMENT' },
      { code: 70, value: '1' },
      { code: 0, value: 'ENDSEC' },
    ];
    const header = makeHeader();
    parseHeader(tokens, 0, header);
    expect(header.measurement).toBe(1);
  });

  it('parses $LTSCALE', () => {
    const tokens: DxfToken[] = [
      { code: 9, value: '$LTSCALE' },
      { code: 40, value: '2.5' },
      { code: 0, value: 'ENDSEC' },
    ];
    const header = makeHeader();
    parseHeader(tokens, 0, header);
    expect(header.ltScale).toBe(2.5);
  });

  it('parses $EXTMIN and $EXTMAX as Point3D', () => {
    const tokens: DxfToken[] = [
      { code: 9, value: '$EXTMIN' },
      { code: 10, value: '-10.5' },
      { code: 20, value: '-20.0' },
      { code: 30, value: '0.0' },
      { code: 9, value: '$EXTMAX' },
      { code: 10, value: '100.5' },
      { code: 20, value: '200.0' },
      { code: 30, value: '50.0' },
      { code: 0, value: 'ENDSEC' },
    ];
    const header = makeHeader();
    parseHeader(tokens, 0, header);
    expect(header.extMin).toEqual({ x: -10.5, y: -20, z: 0 });
    expect(header.extMax).toEqual({ x: 100.5, y: 200, z: 50 });
  });

  it('parses $DWGCODEPAGE', () => {
    const tokens: DxfToken[] = [
      { code: 9, value: '$DWGCODEPAGE' },
      { code: 3, value: 'ANSI_1252' },
      { code: 0, value: 'ENDSEC' },
    ];
    const header = makeHeader();
    parseHeader(tokens, 0, header);
    expect(header.dwgCodePage).toBe('ANSI_1252');
  });

  it('parses $HANDSEED', () => {
    const tokens: DxfToken[] = [
      { code: 9, value: '$HANDSEED' },
      { code: 5, value: 'FFFF' },
      { code: 0, value: 'ENDSEC' },
    ];
    const header = makeHeader();
    parseHeader(tokens, 0, header);
    expect(header.handleSeed).toBe('FFFF');
  });

  it('stores unknown variables by name', () => {
    const tokens: DxfToken[] = [
      { code: 9, value: '$CUSTOM_VAR' },
      { code: 1, value: 'custom_value' },
      { code: 0, value: 'ENDSEC' },
    ];
    const header = makeHeader();
    parseHeader(tokens, 0, header);
    expect(header['$CUSTOM_VAR']).toBe('custom_value');
  });

  it('returns index past ENDSEC', () => {
    const tokens: DxfToken[] = [
      { code: 9, value: '$ACADVER' },
      { code: 1, value: 'AC1014' },
      { code: 0, value: 'ENDSEC' },
      { code: 0, value: 'EOF' },
    ];
    const header = makeHeader();
    const next = parseHeader(tokens, 0, header);
    expect(next).toBe(3); // index of EOF token
  });

  it('handles starting at non-zero index', () => {
    const tokens: DxfToken[] = [
      { code: 0, value: 'SECTION' },  // index 0 — skipped
      { code: 2, value: 'HEADER' },   // index 1 — skipped
      { code: 9, value: '$ACADVER' }, // index 2
      { code: 1, value: 'AC1021' },   // index 3
      { code: 0, value: 'ENDSEC' },   // index 4
    ];
    const header = makeHeader();
    const next = parseHeader(tokens, 2, header);
    expect(header.acadVersion).toBe('AC1021');
    expect(next).toBe(5);
  });
});
