import { describe, it, expect } from 'vitest';
import { parseTables } from './tables.js';
import type { DxfToken } from '../tokenizer.js';
import type { DxfDocument, DxfLayer, DxfLineType, DxfStyle } from '../types.js';

function makeDoc(): DxfDocument {
  return {
    header: { acadVersion: '', insUnits: 0, measurement: 0, ltScale: 1 },
    layers: new Map(),
    lineTypes: new Map(),
    styles: new Map(),
    blocks: new Map(),
    entities: [],
  };
}

describe('parseTables', () => {
  describe('LAYER table', () => {
    it('parses a single layer', () => {
      const tokens: DxfToken[] = [
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'LAYER' },
        { code: 0, value: 'LAYER' },
        { code: 2, value: 'Walls' },
        { code: 62, value: '1' },
        { code: 6, value: 'DASHED' },
        { code: 70, value: '0' },
        { code: 370, value: '50' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'ENDSEC' },
      ];
      const doc = makeDoc();
      parseTables(tokens, 0, doc);
      const layer = doc.layers.get('Walls')!;
      expect(layer.name).toBe('Walls');
      expect(layer.color).toBe(1);
      expect(layer.lineType).toBe('DASHED');
      expect(layer.flags).toBe(0);
      expect(layer.lineWeight).toBe(50);
    });

    it('parses multiple layers', () => {
      const tokens: DxfToken[] = [
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'LAYER' },
        { code: 0, value: 'LAYER' },
        { code: 2, value: 'LayerA' },
        { code: 62, value: '1' },
        { code: 0, value: 'LAYER' },
        { code: 2, value: 'LayerB' },
        { code: 62, value: '3' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'ENDSEC' },
      ];
      const doc = makeDoc();
      parseTables(tokens, 0, doc);
      expect(doc.layers.size).toBe(2);
      expect(doc.layers.get('LayerA')!.color).toBe(1);
      expect(doc.layers.get('LayerB')!.color).toBe(3);
    });

    it('parses layer trueColor (code 420)', () => {
      const tokens: DxfToken[] = [
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'LAYER' },
        { code: 0, value: 'LAYER' },
        { code: 2, value: 'TrueColorLayer' },
        { code: 62, value: '7' },
        { code: 420, value: '16711680' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'ENDSEC' },
      ];
      const doc = makeDoc();
      parseTables(tokens, 0, doc);
      expect(doc.layers.get('TrueColorLayer')!.trueColor).toBe(16711680);
    });

    it('uses default values for omitted layer properties', () => {
      const tokens: DxfToken[] = [
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'LAYER' },
        { code: 0, value: 'LAYER' },
        { code: 2, value: 'Minimal' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'ENDSEC' },
      ];
      const doc = makeDoc();
      parseTables(tokens, 0, doc);
      const layer = doc.layers.get('Minimal')!;
      expect(layer.color).toBe(7);
      expect(layer.lineType).toBe('Continuous');
      expect(layer.flags).toBe(0);
      expect(layer.lineWeight).toBe(-3);
    });
  });

  describe('LTYPE table', () => {
    it('parses a line type with pattern', () => {
      const tokens: DxfToken[] = [
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'LTYPE' },
        { code: 0, value: 'LTYPE' },
        { code: 2, value: 'DASHED' },
        { code: 3, value: 'Dash __ __ __' },
        { code: 40, value: '0.75' },
        { code: 49, value: '0.5' },
        { code: 49, value: '-0.25' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'ENDSEC' },
      ];
      const doc = makeDoc();
      parseTables(tokens, 0, doc);
      const lt = doc.lineTypes.get('DASHED')!;
      expect(lt.name).toBe('DASHED');
      expect(lt.description).toBe('Dash __ __ __');
      expect(lt.totalLength).toBe(0.75);
      expect(lt.pattern).toEqual([0.5, -0.25]);
    });

    it('skips line type entries with empty name', () => {
      const tokens: DxfToken[] = [
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'LTYPE' },
        { code: 0, value: 'LTYPE' },
        // no code 2 — name stays ''
        { code: 3, value: 'desc' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'ENDSEC' },
      ];
      const doc = makeDoc();
      parseTables(tokens, 0, doc);
      expect(doc.lineTypes.size).toBe(0);
    });
  });

  describe('STYLE table', () => {
    it('parses a text style', () => {
      const tokens: DxfToken[] = [
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'STYLE' },
        { code: 0, value: 'STYLE' },
        { code: 2, value: 'Standard' },
        { code: 3, value: 'txt.shx' },
        { code: 4, value: '' },
        { code: 40, value: '0.0' },
        { code: 41, value: '1.0' },
        { code: 50, value: '0.0' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'ENDSEC' },
      ];
      const doc = makeDoc();
      parseTables(tokens, 0, doc);
      const style = doc.styles.get('Standard')!;
      expect(style.fontName).toBe('txt.shx');
      expect(style.bigFontName).toBe('');
      expect(style.height).toBe(0);
      expect(style.widthFactor).toBe(1);
      expect(style.obliqueAngle).toBe(0);
    });

    it('skips style entries with empty name', () => {
      const tokens: DxfToken[] = [
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'STYLE' },
        { code: 0, value: 'STYLE' },
        { code: 3, value: 'arial.ttf' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'ENDSEC' },
      ];
      const doc = makeDoc();
      parseTables(tokens, 0, doc);
      expect(doc.styles.size).toBe(0);
    });
  });

  describe('unknown tables', () => {
    it('skips unknown table types', () => {
      const tokens: DxfToken[] = [
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'VPORT' },
        { code: 0, value: 'VPORT' },
        { code: 2, value: '*Active' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'LAYER' },
        { code: 0, value: 'LAYER' },
        { code: 2, value: 'TestLayer' },
        { code: 62, value: '5' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'ENDSEC' },
      ];
      const doc = makeDoc();
      parseTables(tokens, 0, doc);
      expect(doc.layers.get('TestLayer')!.color).toBe(5);
    });
  });

  describe('return index', () => {
    it('returns index past ENDSEC', () => {
      const tokens: DxfToken[] = [
        { code: 0, value: 'TABLE' },
        { code: 2, value: 'LAYER' },
        { code: 0, value: 'ENDTAB' },
        { code: 0, value: 'ENDSEC' },
        { code: 0, value: 'EOF' },
      ];
      const doc = makeDoc();
      const next = parseTables(tokens, 0, doc);
      expect(next).toBe(4); // past ENDSEC, pointing at EOF
    });
  });
});
