/**
 * Tests for convert.ts — convertDwgToDxf input validation, version checks,
 * WASM interaction, timeout handling, and MEMFS cleanup.
 *
 * The WASM module is mocked since it doesn't exist yet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper to create a buffer with a DWG version string header
function dwgBuffer(version: string, extraBytes = 100): ArrayBuffer {
  const total = version.length + extraBytes;
  const buf = new ArrayBuffer(total);
  const view = new Uint8Array(buf);
  for (let i = 0; i < version.length; i++) {
    view[i] = version.charCodeAt(i);
  }
  // Fill rest with zeros (like real DWG file body)
  return buf;
}

function emptyBuffer(): ArrayBuffer {
  return new ArrayBuffer(0);
}

describe('convertDwgToDxf', () => {
  let mockModule: {
    ccall: ReturnType<typeof vi.fn>;
    FS: {
      writeFile: ReturnType<typeof vi.fn>;
      readFile: ReturnType<typeof vi.fn>;
      unlink: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();

    mockModule = {
      ccall: vi.fn().mockReturnValue(0), // success
      FS: {
        writeFile: vi.fn(),
        readFile: vi.fn().mockReturnValue('0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF\n'),
        unlink: vi.fn(),
      },
    };
  });

  async function getConvert() {
    // Mock wasm-loader to provide our mock module
    vi.doMock('./wasm-loader.js', () => ({
      initWasm: vi.fn().mockResolvedValue(undefined),
      getModule: vi.fn().mockReturnValue(mockModule),
    }));

    const mod = await import('./convert.js');
    return mod.convertDwgToDxf;
  }

  // ----------------------------------------------------------
  // Input validation
  // ----------------------------------------------------------

  describe('input validation', () => {
    it('throws for empty buffer', async () => {
      const convertDwgToDxf = await getConvert();
      await expect(convertDwgToDxf(emptyBuffer())).rejects.toThrow(
        'Cannot convert empty buffer',
      );
    });

    it('throws for null/undefined buffer', async () => {
      const convertDwgToDxf = await getConvert();
      await expect(convertDwgToDxf(null as any)).rejects.toThrow(
        'Cannot convert empty buffer',
      );
    });
  });

  // ----------------------------------------------------------
  // DWG version validation
  // ----------------------------------------------------------

  describe('version validation', () => {
    it('throws for unrecognized DWG version', async () => {
      const convertDwgToDxf = await getConvert();
      const buf = dwgBuffer('AC1099');
      await expect(convertDwgToDxf(buf)).rejects.toThrow('Unrecognized DWG version "AC1099"');
    });

    it('throws for version too old (AC1009 < AC1012)', async () => {
      const convertDwgToDxf = await getConvert();
      const buf = dwgBuffer('AC1009');
      await expect(convertDwgToDxf(buf)).rejects.toThrow('too old');
    });

    it('accepts minimum supported version AC1012', async () => {
      const convertDwgToDxf = await getConvert();
      const buf = dwgBuffer('AC1012');
      const result = await convertDwgToDxf(buf);
      expect(result).toBeTruthy();
    });

    it('accepts latest known version AC1032', async () => {
      const convertDwgToDxf = await getConvert();
      const buf = dwgBuffer('AC1032');
      const result = await convertDwgToDxf(buf);
      expect(result).toBeTruthy();
    });

    it('proceeds for non-DWG buffers (no version check, skips version validation)', async () => {
      // A buffer that doesn't start with AC10 — isDwg returns false,
      // getDwgVersion returns null, so version checks are skipped.
      // It still goes through to WASM (which might fail in practice, but
      // the validation logic doesn't block it).
      const convertDwgToDxf = await getConvert();
      const buf = new ArrayBuffer(100);
      const view = new Uint8Array(buf);
      view[0] = 0x50; // 'P'
      view[1] = 0x4b; // 'K'
      const result = await convertDwgToDxf(buf);
      expect(result).toBeTruthy();
    });
  });

  // ----------------------------------------------------------
  // WASM interaction
  // ----------------------------------------------------------

  describe('WASM interaction', () => {
    it('writes input to MEMFS and reads output', async () => {
      const convertDwgToDxf = await getConvert();
      const buf = dwgBuffer('AC1032');

      await convertDwgToDxf(buf);

      // Should write the DWG bytes to MEMFS
      expect(mockModule.FS.writeFile).toHaveBeenCalledTimes(1);
      const [inputPath, inputData] = mockModule.FS.writeFile.mock.calls[0]!;
      expect(inputPath).toMatch(/^\/tmp\/cadview_input_.*\.dwg$/);
      expect(inputData).toBeInstanceOf(Uint8Array);

      // Should call the C convert function
      expect(mockModule.ccall).toHaveBeenCalledTimes(1);
      expect(mockModule.ccall).toHaveBeenCalledWith(
        'convert',
        'number',
        ['string', 'string'],
        expect.arrayContaining([
          expect.stringMatching(/^\/tmp\/cadview_input_.*\.dwg$/),
          expect.stringMatching(/^\/tmp\/cadview_output_.*\.dxf$/),
        ]),
      );

      // Should read the DXF output from MEMFS
      expect(mockModule.FS.readFile).toHaveBeenCalledTimes(1);
      const [outputPath, opts] = mockModule.FS.readFile.mock.calls[0]!;
      expect(outputPath).toMatch(/^\/tmp\/cadview_output_.*\.dxf$/);
      expect(opts).toEqual({ encoding: 'utf8' });
    });

    it('cleans up MEMFS files after successful conversion', async () => {
      const convertDwgToDxf = await getConvert();
      await convertDwgToDxf(dwgBuffer('AC1032'));

      // unlink should be called for both input and output
      expect(mockModule.FS.unlink).toHaveBeenCalledTimes(2);
    });

    it('cleans up MEMFS files even when ccall fails', async () => {
      mockModule.ccall.mockReturnValue(1); // non-zero exit code

      const convertDwgToDxf = await getConvert();
      await expect(convertDwgToDxf(dwgBuffer('AC1032'))).rejects.toThrow('error code 1');

      // Cleanup should still happen
      expect(mockModule.FS.unlink).toHaveBeenCalledTimes(2);
    });

    it('uses unique filenames for concurrent conversions', async () => {
      const convertDwgToDxf = await getConvert();

      // Run two conversions concurrently
      const [, ] = await Promise.all([
        convertDwgToDxf(dwgBuffer('AC1032')),
        convertDwgToDxf(dwgBuffer('AC1027')),
      ]);

      // Should have 2 writeFile calls with different paths
      expect(mockModule.FS.writeFile).toHaveBeenCalledTimes(2);
      const path1 = mockModule.FS.writeFile.mock.calls[0]![0] as string;
      const path2 = mockModule.FS.writeFile.mock.calls[1]![0] as string;
      expect(path1).not.toBe(path2);
    });
  });

  // ----------------------------------------------------------
  // Error handling — non-zero exit code
  // ----------------------------------------------------------

  describe('conversion error handling', () => {
    it('throws with exit code and version info on failure', async () => {
      mockModule.ccall.mockReturnValue(42);

      const convertDwgToDxf = await getConvert();
      await expect(convertDwgToDxf(dwgBuffer('AC1032'))).rejects.toThrow(
        /error code 42.*AC1032.*R2018/,
      );
    });

    it('throws when output is empty', async () => {
      mockModule.FS.readFile.mockReturnValue('');

      const convertDwgToDxf = await getConvert();
      await expect(convertDwgToDxf(dwgBuffer('AC1032'))).rejects.toThrow(
        'Conversion produced empty DXF output',
      );
    });

    it('throws when output is null', async () => {
      mockModule.FS.readFile.mockReturnValue(null);

      const convertDwgToDxf = await getConvert();
      await expect(convertDwgToDxf(dwgBuffer('AC1032'))).rejects.toThrow(
        'Conversion produced empty DXF output',
      );
    });

    it('handles unlink failures silently during cleanup', async () => {
      mockModule.FS.unlink.mockImplementation(() => {
        throw new Error('file not found');
      });

      const convertDwgToDxf = await getConvert();
      // Should not throw despite unlink failures
      const result = await convertDwgToDxf(dwgBuffer('AC1032'));
      expect(result).toBeTruthy();
    });
  });

  // ----------------------------------------------------------
  // Timeout
  // ----------------------------------------------------------

  describe('timeout', () => {
    it('disables timeout when set to 0', async () => {
      const convertDwgToDxf = await getConvert();

      // With timeout disabled (0), should work fine
      const result = await convertDwgToDxf(dwgBuffer('AC1032'), { timeout: 0 });
      expect(result).toBeTruthy();
    });

    it('uses default 30s timeout when not specified', async () => {
      const convertDwgToDxf = await getConvert();
      // Just verify it doesn't throw with default timeout on a fast operation
      const result = await convertDwgToDxf(dwgBuffer('AC1032'));
      expect(result).toBeTruthy();
    });
  });

  // ----------------------------------------------------------
  // Return value
  // ----------------------------------------------------------

  describe('return value', () => {
    it('returns the DXF string from MEMFS readFile', async () => {
      const expectedDxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF\n';
      mockModule.FS.readFile.mockReturnValue(expectedDxf);

      const convertDwgToDxf = await getConvert();
      const result = await convertDwgToDxf(dwgBuffer('AC1032'));
      expect(result).toBe(expectedDxf);
    });
  });

  // ----------------------------------------------------------
  // fixNegativeLayerColors (Bug 5 fix)
  // ----------------------------------------------------------

  describe('fixNegativeLayerColors', () => {
    it('strips negative sign from code-62 layer color values', async () => {
      // LibreDWG writes negative code-62 values for "layer OFF" state.
      // The fix should make all layer colors positive so layers are visible.
      mockModule.FS.readFile.mockReturnValue(
        '0\nSECTION\n2\nTABLES\n0\nLAYER\n 62\n -7\n0\nENDSEC\n0\nEOF\n',
      );

      const convertDwgToDxf = await getConvert();
      const result = await convertDwgToDxf(dwgBuffer('AC1032'));

      expect(result).toContain(' 62\n 7\n');
      expect(result).not.toContain('-7');
    });

    it('fixes multiple negative layer colors', async () => {
      mockModule.FS.readFile.mockReturnValue(
        '0\nLAYER\n 62\n -7\n0\nLAYER\n 62\n -1\n0\nLAYER\n 62\n -5\n0\nEOF\n',
      );

      const convertDwgToDxf = await getConvert();
      const result = await convertDwgToDxf(dwgBuffer('AC1032'));

      expect(result).not.toMatch(/-\d+/); // no negative numbers remain
      expect(result).toContain(' 62\n 7\n');
      expect(result).toContain(' 62\n 1\n');
      expect(result).toContain(' 62\n 5\n');
    });

    it('does not modify already-positive code-62 values', async () => {
      const cleanDxf = '0\nLAYER\n 62\n 7\n0\nLAYER\n 62\n 1\n0\nEOF\n';
      mockModule.FS.readFile.mockReturnValue(cleanDxf);

      const convertDwgToDxf = await getConvert();
      const result = await convertDwgToDxf(dwgBuffer('AC1032'));

      expect(result).toBe(cleanDxf);
    });

    it('handles mixed positive and negative code-62 values', async () => {
      mockModule.FS.readFile.mockReturnValue(
        '0\nLAYER\n 62\n 7\n0\nLAYER\n 62\n -3\n0\nLAYER\n 62\n 1\n0\nEOF\n',
      );

      const convertDwgToDxf = await getConvert();
      const result = await convertDwgToDxf(dwgBuffer('AC1032'));

      expect(result).toContain(' 62\n 7\n');
      expect(result).toContain(' 62\n 3\n'); // was -3
      expect(result).toContain(' 62\n 1\n');
      expect(result).not.toContain('-3');
    });
  });
});
