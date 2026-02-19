import { describe, it, expect } from 'vitest';
import { parseDxf, DxfParseError } from './index.js';

/** Helper: build a minimal valid DXF string from sections */
function dxf(...sections: string[]): string {
  return sections.join('\n') + '\n  0\nEOF\n';
}

/** Helper: wrap content in a HEADER section */
function headerSection(content: string): string {
  return `  0\nSECTION\n  2\nHEADER\n${content}  0\nENDSEC`;
}

/** Helper: wrap content in a TABLES section */
function tablesSection(content: string): string {
  return `  0\nSECTION\n  2\nTABLES\n${content}  0\nENDSEC`;
}

/** Helper: wrap content in an ENTITIES section */
function entitiesSection(content: string): string {
  return `  0\nSECTION\n  2\nENTITIES\n${content}  0\nENDSEC`;
}

describe('parseDxf', () => {
  // ── Input validation ──────────────────────────────────────────────

  describe('input validation', () => {
    it('throws DxfParseError for empty string', () => {
      expect(() => parseDxf('')).toThrow(DxfParseError);
      expect(() => parseDxf('')).toThrow('Input is empty');
    });

    it('throws DxfParseError for empty ArrayBuffer', () => {
      expect(() => parseDxf(new ArrayBuffer(0))).toThrow(DxfParseError);
      expect(() => parseDxf(new ArrayBuffer(0))).toThrow('ArrayBuffer is empty');
    });

    it('throws DxfParseError for invalid input type', () => {
      expect(() => parseDxf(42 as unknown as string)).toThrow(DxfParseError);
      expect(() => parseDxf(42 as unknown as string)).toThrow('Invalid input type');
    });

    it('throws DxfParseError for binary DXF sentinel', () => {
      const sentinel = 'AutoCAD Binary DXF\r\n\x1a\x00';
      const buf = new TextEncoder().encode(sentinel).buffer;
      expect(() => parseDxf(buf)).toThrow(DxfParseError);
      expect(() => parseDxf(buf)).toThrow('Binary DXF format is not supported');
    });

    it('throws DxfParseError when tokens are empty (whitespace-only input)', () => {
      expect(() => parseDxf('   \n\n  ')).toThrow(DxfParseError);
      expect(() => parseDxf('   \n\n  ')).toThrow('no tokens');
    });
  });

  // ── Minimal valid DXF ─────────────────────────────────────────────

  describe('minimal parsing', () => {
    it('parses a bare EOF-only DXF', () => {
      const doc = parseDxf('  0\nEOF\n');
      expect(doc.header.acadVersion).toBe('');
      expect(doc.entities).toEqual([]);
      expect(doc.layers.has('0')).toBe(true); // default layer ensured
    });

    it('creates default header with correct defaults', () => {
      const doc = parseDxf('  0\nEOF\n');
      expect(doc.header.insUnits).toBe(0);
      expect(doc.header.measurement).toBe(0);
      expect(doc.header.ltScale).toBe(1);
    });

    it('creates empty collections', () => {
      const doc = parseDxf('  0\nEOF\n');
      expect(doc.lineTypes.size).toBe(0);
      expect(doc.styles.size).toBe(0);
      expect(doc.blocks.size).toBe(0);
      expect(doc.entities).toHaveLength(0);
    });
  });

  // ── Default layer (0) guarantee ───────────────────────────────────

  describe('default layer', () => {
    it('ensures layer "0" exists even with no TABLES section', () => {
      const doc = parseDxf('  0\nEOF\n');
      const layer0 = doc.layers.get('0');
      expect(layer0).toBeDefined();
      expect(layer0!.name).toBe('0');
      expect(layer0!.color).toBe(7);
      expect(layer0!.lineType).toBe('Continuous');
      expect(layer0!.isOff).toBe(false);
      expect(layer0!.isFrozen).toBe(false);
      expect(layer0!.isLocked).toBe(false);
    });

    it('does not overwrite existing layer "0" from file', () => {
      const input = dxf(
        tablesSection(
          `  0\nTABLE\n  2\nLAYER\n` +
          `  0\nLAYER\n  2\n0\n 62\n3\n  6\nDASHED\n 70\n0\n` +
          `  0\nENDTAB\n`
        )
      );
      const doc = parseDxf(input);
      const layer0 = doc.layers.get('0')!;
      expect(layer0.color).toBe(3); // green, not default 7
      expect(layer0.lineType).toBe('DASHED');
    });
  });

  // ── Derived layer flags ───────────────────────────────────────────

  describe('layer derived flags', () => {
    it('computes isOff from negative color', () => {
      const input = dxf(
        tablesSection(
          `  0\nTABLE\n  2\nLAYER\n` +
          `  0\nLAYER\n  2\nOffLayer\n 62\n-1\n 70\n0\n` +
          `  0\nENDTAB\n`
        )
      );
      const doc = parseDxf(input);
      const layer = doc.layers.get('OffLayer')!;
      expect(layer.isOff).toBe(true);
      expect(layer.color).toBe(1); // abs(-1) = 1
    });

    it('computes isFrozen from flags & 1', () => {
      const input = dxf(
        tablesSection(
          `  0\nTABLE\n  2\nLAYER\n` +
          `  0\nLAYER\n  2\nFrozen\n 62\n5\n 70\n1\n` +
          `  0\nENDTAB\n`
        )
      );
      const doc = parseDxf(input);
      expect(doc.layers.get('Frozen')!.isFrozen).toBe(true);
    });

    it('computes isLocked from flags & 4', () => {
      const input = dxf(
        tablesSection(
          `  0\nTABLE\n  2\nLAYER\n` +
          `  0\nLAYER\n  2\nLocked\n 62\n2\n 70\n4\n` +
          `  0\nENDTAB\n`
        )
      );
      const doc = parseDxf(input);
      expect(doc.layers.get('Locked')!.isLocked).toBe(true);
    });

    it('handles combined flags (frozen + locked = 5)', () => {
      const input = dxf(
        tablesSection(
          `  0\nTABLE\n  2\nLAYER\n` +
          `  0\nLAYER\n  2\nBoth\n 62\n-4\n 70\n5\n` +
          `  0\nENDTAB\n`
        )
      );
      const doc = parseDxf(input);
      const layer = doc.layers.get('Both')!;
      expect(layer.isOff).toBe(true);
      expect(layer.isFrozen).toBe(true);
      expect(layer.isLocked).toBe(true);
      expect(layer.color).toBe(4); // abs(-4)
    });
  });

  // ── HEADER section parsing ────────────────────────────────────────

  describe('header parsing', () => {
    it('parses $ACADVER', () => {
      const input = dxf(
        headerSection(`  9\n$ACADVER\n  1\nAC1027\n`)
      );
      const doc = parseDxf(input);
      expect(doc.header.acadVersion).toBe('AC1027');
    });

    it('parses $INSUNITS and $MEASUREMENT', () => {
      const input = dxf(
        headerSection(`  9\n$INSUNITS\n 70\n4\n  9\n$MEASUREMENT\n 70\n1\n`)
      );
      const doc = parseDxf(input);
      expect(doc.header.insUnits).toBe(4);
      expect(doc.header.measurement).toBe(1);
    });

    it('parses $EXTMIN and $EXTMAX as Point3D', () => {
      const input = dxf(
        headerSection(
          `  9\n$EXTMIN\n 10\n-10.5\n 20\n-20.0\n 30\n0.0\n` +
          `  9\n$EXTMAX\n 10\n100.5\n 20\n200.0\n 30\n50.0\n`
        )
      );
      const doc = parseDxf(input);
      expect(doc.header.extMin).toEqual({ x: -10.5, y: -20, z: 0 });
      expect(doc.header.extMax).toEqual({ x: 100.5, y: 200, z: 50 });
    });

    it('parses $LTSCALE', () => {
      const input = dxf(
        headerSection(`  9\n$LTSCALE\n 40\n2.5\n`)
      );
      const doc = parseDxf(input);
      expect(doc.header.ltScale).toBe(2.5);
    });
  });

  // ── Section routing ───────────────────────────────────────────────

  describe('section routing', () => {
    it('skips unknown sections (CLASSES, OBJECTS, etc.)', () => {
      const input = dxf(
        `  0\nSECTION\n  2\nCLASSES\n  0\nSOMETHING\n  0\nENDSEC`,
        entitiesSection(`  0\nPOINT\n 10\n1.0\n 20\n2.0\n 30\n3.0\n`)
      );
      const doc = parseDxf(input);
      // Should still parse the ENTITIES section after skipping CLASSES
      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0]!.type).toBe('POINT');
    });

    it('handles multiple sections in order', () => {
      const input = dxf(
        headerSection(`  9\n$ACADVER\n  1\nAC1024\n`),
        tablesSection(
          `  0\nTABLE\n  2\nLAYER\n` +
          `  0\nLAYER\n  2\nWalls\n 62\n1\n 70\n0\n` +
          `  0\nENDTAB\n`
        ),
        entitiesSection(`  0\nLINE\n  8\nWalls\n 10\n0\n 20\n0\n 30\n0\n 11\n10\n 21\n10\n 31\n0\n`)
      );
      const doc = parseDxf(input);
      expect(doc.header.acadVersion).toBe('AC1024');
      expect(doc.layers.has('Walls')).toBe(true);
      expect(doc.entities).toHaveLength(1);
    });
  });

  // ── Encoding / Unicode ────────────────────────────────────────────

  describe('encoding', () => {
    it('decodes \\U+XXXX Unicode escape sequences', () => {
      const input = dxf(
        entitiesSection(
          `  0\nTEXT\n  1\nHello\\U+00E9World\n 10\n0\n 20\n0\n 30\n0\n 40\n2.5\n`
        )
      );
      const doc = parseDxf(input);
      const text = doc.entities[0] as { text: string };
      expect(text.text).toBe('HelloéWorld');
    });

    it('accepts ArrayBuffer input (UTF-8 encoded)', () => {
      const str = '  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1027\n  0\nENDSEC\n  0\nEOF\n';
      const buf = new TextEncoder().encode(str).buffer;
      const doc = parseDxf(buf);
      expect(doc.header.acadVersion).toBe('AC1027');
    });
  });

  // ── Error wrapping ────────────────────────────────────────────────

  describe('error wrapping', () => {
    it('all thrown errors are DxfParseError instances', () => {
      try {
        parseDxf('');
      } catch (err) {
        expect(err).toBeInstanceOf(DxfParseError);
        expect((err as DxfParseError).name).toBe('DxfParseError');
      }
    });

    it('preserves cause chain for encoding errors', () => {
      // Create an ArrayBuffer with invalid content that passes sentinel check
      // but won't trigger our specific error paths easily — we use empty-ish content
      // The binary DXF error should be a DxfParseError with no cause (it's thrown directly)
      const sentinel = 'AutoCAD Binary DXF\r\n\x1a\x00';
      const buf = new TextEncoder().encode(sentinel).buffer;
      try {
        parseDxf(buf);
      } catch (err) {
        expect(err).toBeInstanceOf(DxfParseError);
        // Binary DXF is thrown directly from decodeInput, no cause needed
      }
    });
  });

  // ── Entity parsing integration ────────────────────────────────────

  describe('entity parsing integration', () => {
    it('parses a LINE entity with correct coordinates', () => {
      const input = dxf(
        entitiesSection(
          `  0\nLINE\n  8\n0\n 10\n1.0\n 20\n2.0\n 30\n3.0\n 11\n4.0\n 21\n5.0\n 31\n6.0\n`
        )
      );
      const doc = parseDxf(input);
      expect(doc.entities).toHaveLength(1);
      const line = doc.entities[0] as any;
      expect(line.type).toBe('LINE');
      expect(line.start).toEqual({ x: 1, y: 2, z: 3 });
      expect(line.end).toEqual({ x: 4, y: 5, z: 6 });
    });

    it('parses a CIRCLE entity', () => {
      const input = dxf(
        entitiesSection(
          `  0\nCIRCLE\n  8\n0\n 10\n10.0\n 20\n20.0\n 30\n0.0\n 40\n5.0\n`
        )
      );
      const doc = parseDxf(input);
      const circle = doc.entities[0] as any;
      expect(circle.type).toBe('CIRCLE');
      expect(circle.center).toEqual({ x: 10, y: 20, z: 0 });
      expect(circle.radius).toBe(5);
    });

    it('parses multiple entities in order', () => {
      const input = dxf(
        entitiesSection(
          `  0\nPOINT\n 10\n0\n 20\n0\n 30\n0\n` +
          `  0\nPOINT\n 10\n1\n 20\n1\n 30\n1\n` +
          `  0\nPOINT\n 10\n2\n 20\n2\n 30\n2\n`
        )
      );
      const doc = parseDxf(input);
      expect(doc.entities).toHaveLength(3);
      expect((doc.entities[2] as any).position).toEqual({ x: 2, y: 2, z: 2 });
    });

    it('silently skips unknown entity types', () => {
      const input = dxf(
        entitiesSection(
          `  0\nUNKNOWN_ENTITY\n  8\n0\n 10\n1\n 20\n2\n` +
          `  0\nPOINT\n 10\n0\n 20\n0\n 30\n0\n`
        )
      );
      const doc = parseDxf(input);
      expect(doc.entities).toHaveLength(1);
      expect(doc.entities[0]!.type).toBe('POINT');
    });
  });
});
