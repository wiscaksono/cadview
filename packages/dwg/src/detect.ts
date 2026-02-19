/**
 * DWG format detection utilities.
 *
 * All DWG versions start with a 6-byte ASCII version string:
 *   "AC10" followed by two digit characters (e.g. "AC1032" for R2018).
 *
 * @module
 */

/**
 * Known DWG version strings and their AutoCAD release names.
 */
export const DWG_VERSIONS: Record<string, string> = {
  AC1009: 'R11/R12',
  AC1012: 'R13',
  AC1014: 'R14',
  AC1015: 'R2000',
  AC1018: 'R2004',
  AC1021: 'R2007',
  AC1024: 'R2010',
  AC1027: 'R2013',
  AC1032: 'R2018',
};

/**
 * Minimum DWG version supported by LibreDWG.
 * Versions older than R13 (AC1012) are not supported.
 */
export const MIN_SUPPORTED_VERSION = 'AC1012';

/**
 * Detect DWG format by checking magic bytes.
 *
 * Checks for "AC10" (bytes 0-3) followed by two ASCII digits (bytes 4-5).
 * This avoids false positives from text files that happen to start with "AC".
 *
 * @param buffer - The file content as an ArrayBuffer
 * @returns true if the buffer appears to be a DWG file
 */
export function isDwg(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 6) return false;

  const bytes = new Uint8Array(buffer, 0, 6);

  // Check "AC10" prefix (0x41='A', 0x43='C', 0x31='1', 0x30='0')
  if (
    bytes[0] !== 0x41 ||
    bytes[1] !== 0x43 ||
    bytes[2] !== 0x31 ||
    bytes[3] !== 0x30
  ) {
    return false;
  }

  // Check bytes 4-5 are ASCII digits (0x30='0' to 0x39='9')
  if (
    bytes[4]! < 0x30 || bytes[4]! > 0x39 ||
    bytes[5]! < 0x30 || bytes[5]! > 0x39
  ) {
    return false;
  }

  return true;
}

/**
 * Extract the DWG version string from a buffer (e.g. "AC1032").
 *
 * @param buffer - The file content as an ArrayBuffer
 * @returns The 6-character version string, or null if the buffer is not a valid DWG file
 */
export function getDwgVersion(buffer: ArrayBuffer): string | null {
  if (!isDwg(buffer)) return null;
  const bytes = new Uint8Array(buffer, 0, 6);
  return String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!, bytes[4]!, bytes[5]!);
}

/**
 * Get the human-readable AutoCAD release name for a DWG version string.
 *
 * @param version - The 6-character DWG version string (e.g. "AC1032")
 * @returns The release name (e.g. "R2018"), or null if unrecognized
 */
export function getDwgReleaseName(version: string): string | null {
  return DWG_VERSIONS[version] ?? null;
}
