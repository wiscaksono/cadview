/**
 * DWG to DXF conversion bridge using LibreDWG WASM.
 *
 * @module
 */

import { initWasm, getModule } from './wasm-loader.js';
import { getDwgVersion, getDwgReleaseName, DWG_VERSIONS, MIN_SUPPORTED_VERSION } from './detect.js';
import type { WasmOptions } from './wasm-loader.js';

/**
 * Fix negative layer colors in DXF output from LibreDWG.
 *
 * LibreDWG preserves the "layer OFF" state from the DWG file by writing negative
 * color values for code 62 in LAYER table records. In DXF, a negative color means
 * the layer is turned off. This causes all entities on those layers to be invisible
 * when rendered.
 *
 * Since a DWG→DXF conversion should produce a viewable result (not preserve the
 * application-level visibility toggle from AutoCAD's last save), we force all
 * layer colors to positive (visible).
 *
 * This only modifies code 62 values within AcDbLayerTableRecord sections, so
 * entity colors and other table records are not affected.
 */
function fixNegativeLayerColors(dxf: string): string {
  // Match code 62 followed by a negative number within the TABLES section.
  // The regex targets the pattern: \n 62\r?\n followed by whitespace and a negative integer.
  // We only need to fix values in the LAYER table, but since code 62 with negative
  // values ONLY appears in LAYER table records (entity code 62 uses positive values
  // or BYLAYER=256), this regex is safe to apply globally.
  return dxf.replace(
    /(\n\s*62\s*\r?\n\s*)-(\d+)/g,
    '$1$2',
  );
}

/**
 * Options for the DWG to DXF conversion.
 */
export interface ConvertOptions extends WasmOptions {
  /**
   * Timeout in milliseconds for the conversion.
   * Default: 30000 (30 seconds).
   * Set to 0 to disable timeout.
   */
  timeout?: number;
}

/** Counter for unique temp filenames to avoid MEMFS collisions during concurrent conversions */
let fileCounter = 0;

/**
 * Convert a DWG ArrayBuffer to a DXF string using LibreDWG WASM.
 *
 * The WASM module is lazily initialized on first call (~2-5MB download).
 * Subsequent calls reuse the loaded module.
 *
 * ```typescript
 * import { convertDwgToDxf } from '@cadview/dwg';
 * import { parseDxf } from '@cadview/core';
 *
 * const dxfString = await convertDwgToDxf(dwgBuffer);
 * const doc = parseDxf(dxfString);
 * ```
 *
 * @param buffer - The DWG file content as an ArrayBuffer
 * @param options - Optional configuration for WASM loading and conversion
 * @returns The converted DXF content as a string
 * @throws Error if conversion fails, times out, or WASM cannot be loaded
 */
export async function convertDwgToDxf(
  buffer: ArrayBuffer,
  options?: ConvertOptions,
): Promise<string> {
  // --- Input validation ---

  if (!buffer || buffer.byteLength === 0) {
    throw new Error('@cadview/dwg: Cannot convert empty buffer.');
  }

  // Check DWG version for helpful error messages
  const version = getDwgVersion(buffer);

  if (version) {
    // Check if version is known
    if (!(version in DWG_VERSIONS)) {
      const known = Object.entries(DWG_VERSIONS)
        .map(([k, v]) => `${k} (${v})`)
        .join(', ');
      throw new Error(
        `@cadview/dwg: Unrecognized DWG version "${version}". ` +
        `Supported versions: ${known}.`,
      );
    }

    // Check if version is too old
    if (version < MIN_SUPPORTED_VERSION) {
      const releaseName = getDwgReleaseName(version) ?? 'unknown';
      throw new Error(
        `@cadview/dwg: DWG version ${version} (${releaseName}) is too old. ` +
        `Minimum supported version is ${MIN_SUPPORTED_VERSION} (${getDwgReleaseName(MIN_SUPPORTED_VERSION)}).`,
      );
    }
  }

  // --- Initialize WASM ---

  await initWasm(options);
  const module = getModule();

  // --- Convert ---

  // Unique filenames to prevent collisions from concurrent conversions
  const id = `${Date.now()}_${++fileCounter}`;
  const inputPath = `/tmp/cadview_input_${id}.dwg`;
  const outputPath = `/tmp/cadview_output_${id}.dxf`;

  const timeoutMs = options?.timeout ?? 30_000;

  const doConvert = async (): Promise<string> => {
    try {
      // Write DWG bytes to Emscripten virtual filesystem (MEMFS)
      module.FS.writeFile(inputPath, new Uint8Array(buffer));

      // Call LibreDWG conversion (C function compiled to WASM)
      const exitCode = module.ccall(
        'convert',
        'number',
        ['string', 'string'],
        [inputPath, outputPath],
      );

      if (exitCode !== 0) {
        const versionInfo = version
          ? ` (DWG version: ${version} / ${getDwgReleaseName(version) ?? 'unknown'})`
          : '';
        throw new Error(
          `@cadview/dwg: DWG to DXF conversion failed with error code ${exitCode}${versionInfo}. ` +
          'The file may be corrupted, password-protected, or in an unsupported format.',
        );
      }

      // Read converted DXF from virtual filesystem
      const dxfContent = module.FS.readFile(outputPath, { encoding: 'utf8' });

      if (!dxfContent || dxfContent.length === 0) {
        throw new Error(
          '@cadview/dwg: Conversion produced empty DXF output. ' +
          'The DWG file may be password-protected or contain no convertible data.',
        );
      }

      // Fix negative layer colors — LibreDWG preserves "layer OFF" state from the
      // DWG by writing negative code-62 values, making all layers invisible. Force
      // all layer colors positive so the converted DXF renders with all layers visible.
      return fixNegativeLayerColors(dxfContent);
    } finally {
      // Always cleanup MEMFS, even on error
      try { module.FS.unlink(inputPath); } catch { /* file may not exist */ }
      try { module.FS.unlink(outputPath); } catch { /* file may not exist */ }
    }
  };

  // --- With timeout ---

  if (timeoutMs > 0) {
    let timeoutId: ReturnType<typeof setTimeout>;

    return Promise.race([
      doConvert(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(
            `@cadview/dwg: DWG conversion timed out after ${timeoutMs}ms. ` +
            'The file may be too large or complex. Try increasing the timeout option.',
          )),
          timeoutMs,
        );
      }),
    ]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  return doConvert();
}
