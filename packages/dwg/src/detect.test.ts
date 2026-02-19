import { describe, it, expect } from 'vitest';
import {
  isDwg,
  getDwgVersion,
  getDwgReleaseName,
  DWG_VERSIONS,
  MIN_SUPPORTED_VERSION,
} from './detect.js';

/**
 * Helper: create an ArrayBuffer from a string (ASCII).
 */
function strToBuffer(s: string): ArrayBuffer {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i);
  }
  return buf;
}

/**
 * Helper: create an ArrayBuffer from raw byte values.
 */
function bytesToBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

// ============================================================
// isDwg()
// ============================================================

describe('isDwg', () => {
  it('returns true for all known DWG version strings', () => {
    for (const version of Object.keys(DWG_VERSIONS)) {
      // version string followed by some random bytes (like a real file)
      const buf = strToBuffer(version + '\x00\x00\x00\x00');
      expect(isDwg(buf), `should detect ${version}`).toBe(true);
    }
  });

  it('returns true for AC1032 (R2018) header bytes', () => {
    const buf = strToBuffer('AC1032');
    expect(isDwg(buf)).toBe(true);
  });

  it('returns true for AC1009 (R11/R12) header bytes', () => {
    const buf = strToBuffer('AC1009');
    expect(isDwg(buf)).toBe(true);
  });

  it('returns true when buffer is exactly 6 bytes', () => {
    const buf = strToBuffer('AC1015');
    expect(buf.byteLength).toBe(6);
    expect(isDwg(buf)).toBe(true);
  });

  it('returns true when buffer has extra trailing data', () => {
    const buf = strToBuffer('AC1032' + '\x00'.repeat(1000));
    expect(isDwg(buf)).toBe(true);
  });

  it('returns false for buffer shorter than 6 bytes', () => {
    expect(isDwg(strToBuffer(''))).toBe(false);
    expect(isDwg(strToBuffer('AC'))).toBe(false);
    expect(isDwg(strToBuffer('AC10'))).toBe(false);
    expect(isDwg(strToBuffer('AC101'))).toBe(false);
  });

  it('returns false for empty buffer', () => {
    expect(isDwg(new ArrayBuffer(0))).toBe(false);
  });

  it('returns false for DXF content', () => {
    const dxfContent = '  0\nSECTION\n  2\nHEADER\n';
    expect(isDwg(strToBuffer(dxfContent))).toBe(false);
  });

  it('returns false when prefix is wrong', () => {
    expect(isDwg(strToBuffer('BC1032'))).toBe(false); // wrong first byte
    expect(isDwg(strToBuffer('AB1032'))).toBe(false); // wrong second byte
    expect(isDwg(strToBuffer('AC2032'))).toBe(false); // wrong third byte
    expect(isDwg(strToBuffer('AC1132'))).toBe(false); // wrong fourth byte
  });

  it('returns false when bytes 4-5 are not digits', () => {
    // "AC10" prefix correct but 5th/6th bytes are not digits
    expect(isDwg(strToBuffer('AC10AB'))).toBe(false);
    expect(isDwg(strToBuffer('AC10  '))).toBe(false);
    expect(isDwg(strToBuffer('AC10\x00\x00'))).toBe(false);
    expect(isDwg(strToBuffer('AC10a2'))).toBe(false);
    expect(isDwg(strToBuffer('AC103z'))).toBe(false);
  });

  it('returns false for text that happens to contain AC10', () => {
    // "AC10" embedded but not at start
    const buf = strToBuffer('  AC1032');
    expect(isDwg(buf)).toBe(false);
  });

  it('returns true for a future hypothetical version AC1099', () => {
    // Unknown version but valid format
    const buf = strToBuffer('AC1099');
    expect(isDwg(buf)).toBe(true);
  });

  it('handles binary buffer with AC10 prefix and digit bytes', () => {
    // Construct with raw bytes: A=0x41, C=0x43, 1=0x31, 0=0x30, 3=0x33, 2=0x32
    const buf = bytesToBuffer([0x41, 0x43, 0x31, 0x30, 0x33, 0x32]);
    expect(isDwg(buf)).toBe(true);
  });

  it('returns false for bytes that look close but are off by one', () => {
    // byte[4] = 0x2F (just below '0'), byte[5] = 0x3A (just above '9')
    const buf = bytesToBuffer([0x41, 0x43, 0x31, 0x30, 0x2f, 0x3a]);
    expect(isDwg(buf)).toBe(false);
  });
});

// ============================================================
// getDwgVersion()
// ============================================================

describe('getDwgVersion', () => {
  it('returns the version string for valid DWG buffers', () => {
    for (const version of Object.keys(DWG_VERSIONS)) {
      const buf = strToBuffer(version + '\x00\x00');
      expect(getDwgVersion(buf)).toBe(version);
    }
  });

  it('returns "AC1032" for an R2018 file', () => {
    const buf = strToBuffer('AC1032somemore');
    expect(getDwgVersion(buf)).toBe('AC1032');
  });

  it('returns null for non-DWG buffers', () => {
    expect(getDwgVersion(strToBuffer('NOT_DWG'))).toBeNull();
    expect(getDwgVersion(strToBuffer('AC'))).toBeNull();
    expect(getDwgVersion(new ArrayBuffer(0))).toBeNull();
  });

  it('returns version for unknown but valid format versions', () => {
    const buf = strToBuffer('AC1099');
    expect(getDwgVersion(buf)).toBe('AC1099');
  });
});

// ============================================================
// getDwgReleaseName()
// ============================================================

describe('getDwgReleaseName', () => {
  it('returns release names for all known versions', () => {
    expect(getDwgReleaseName('AC1009')).toBe('R11/R12');
    expect(getDwgReleaseName('AC1012')).toBe('R13');
    expect(getDwgReleaseName('AC1014')).toBe('R14');
    expect(getDwgReleaseName('AC1015')).toBe('R2000');
    expect(getDwgReleaseName('AC1018')).toBe('R2004');
    expect(getDwgReleaseName('AC1021')).toBe('R2007');
    expect(getDwgReleaseName('AC1024')).toBe('R2010');
    expect(getDwgReleaseName('AC1027')).toBe('R2013');
    expect(getDwgReleaseName('AC1032')).toBe('R2018');
  });

  it('returns null for unrecognized versions', () => {
    expect(getDwgReleaseName('AC1099')).toBeNull();
    expect(getDwgReleaseName('')).toBeNull();
    expect(getDwgReleaseName('foo')).toBeNull();
  });
});

// ============================================================
// Constants
// ============================================================

describe('DWG_VERSIONS', () => {
  it('contains all expected versions', () => {
    const expectedVersions = [
      'AC1009', 'AC1012', 'AC1014', 'AC1015',
      'AC1018', 'AC1021', 'AC1024', 'AC1027', 'AC1032',
    ];
    for (const v of expectedVersions) {
      expect(DWG_VERSIONS).toHaveProperty(v);
    }
  });

  it('has 9 known versions', () => {
    expect(Object.keys(DWG_VERSIONS)).toHaveLength(9);
  });
});

describe('MIN_SUPPORTED_VERSION', () => {
  it('is AC1012 (R13)', () => {
    expect(MIN_SUPPORTED_VERSION).toBe('AC1012');
  });

  it('is in the known versions map', () => {
    expect(DWG_VERSIONS[MIN_SUPPORTED_VERSION]).toBe('R13');
  });
});
