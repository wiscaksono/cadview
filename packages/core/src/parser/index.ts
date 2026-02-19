import type { DxfDocument, DxfHeader } from './types.js';
import { tokenize } from './tokenizer.js';
import { parseHeader } from './sections/header.js';
import { parseTables } from './sections/tables.js';
import { parseBlocks } from './sections/blocks.js';
import { parseEntities } from './sections/entities.js';

const BINARY_DXF_SENTINEL = 'AutoCAD Binary DXF';

const CODEPAGE_MAP: Record<string, string> = {
  'ANSI_874':  'windows-874',
  'ANSI_932':  'shift_jis',
  'ANSI_936':  'gbk',
  'ANSI_949':  'euc-kr',
  'ANSI_950':  'big5',
  'ANSI_1250': 'windows-1250',
  'ANSI_1251': 'windows-1251',
  'ANSI_1252': 'windows-1252',
  'ANSI_1253': 'windows-1253',
  'ANSI_1254': 'windows-1254',
  'ANSI_1255': 'windows-1255',
  'ANSI_1256': 'windows-1256',
  'ANSI_1257': 'windows-1257',
  'ANSI_1258': 'windows-1258',
};

// Versions >= AC1021 (R2007) use UTF-8
const UTF8_MIN_VERSION = 'AC1021';

function createDefaultHeader(): DxfHeader {
  return {
    acadVersion: '',
    insUnits: 0,
    measurement: 0,
    ltScale: 1,
  };
}

/**
 * Decode Unicode escape sequences (\U+XXXX) commonly found in DXF strings.
 */
function decodeUnicodeEscapes(text: string): string {
  return text.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, hex: string) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
}

/**
 * Detect encoding and decode input to string.
 */
function decodeInput(input: string | ArrayBuffer): string {
  if (typeof input === 'string') {
    return decodeUnicodeEscapes(input);
  }

  // ArrayBuffer path
  const bytes = new Uint8Array(input);

  // Check for binary DXF sentinel
  const sentinelBytes = new TextDecoder('ascii').decode(bytes.slice(0, BINARY_DXF_SENTINEL.length));
  if (sentinelBytes === BINARY_DXF_SENTINEL) {
    throw new Error('Binary DXF format is not supported. Please export as ASCII DXF.');
  }

  // First pass: decode as UTF-8
  let text = new TextDecoder('utf-8').decode(input);

  // Quick parse to find $ACADVER
  const versionMatch = text.match(/\$ACADVER[\s\S]*?\n\s*1\s*\n\s*(\S+)/);
  const version = versionMatch?.[1] ?? '';

  // If pre-R2007, may need codepage re-decode
  if (version && version < UTF8_MIN_VERSION) {
    // Find $DWGCODEPAGE
    const cpMatch = text.match(/\$DWGCODEPAGE[\s\S]*?\n\s*3\s*\n\s*(\S+)/);
    const codepage = cpMatch?.[1] ?? '';
    const encoding = CODEPAGE_MAP[codepage] ?? 'windows-1252';

    if (encoding !== 'utf-8') {
      text = new TextDecoder(encoding).decode(input);
    }
  }

  return decodeUnicodeEscapes(text);
}

function skipSection(tokens: ReturnType<typeof tokenize>, i: number): number {
  while (i < tokens.length) {
    if (tokens[i]!.code === 0 && tokens[i]!.value === 'ENDSEC') {
      return i + 1;
    }
    i++;
  }
  return i;
}

/**
 * Ensure layer "0" exists — it's required by DXF spec.
 */
function ensureDefaultLayer(doc: DxfDocument): void {
  if (!doc.layers.has('0')) {
    doc.layers.set('0', {
      name: '0',
      color: 7,
      lineType: 'Continuous',
      flags: 0,
      lineWeight: -3,
      isOff: false,
      isFrozen: false,
      isLocked: false,
    });
  }
}

/**
 * Compute derived flags from raw layer data.
 * - isOff: color < 0 (layer OFF). Store Math.abs(color) as the actual color.
 * - isFrozen: flags & 1
 * - isLocked: flags & 4
 */
function computeDerivedLayerFlags(doc: DxfDocument): void {
  for (const [, layer] of doc.layers) {
    layer.isOff = layer.color < 0;
    if (layer.isOff) {
      layer.color = Math.abs(layer.color);
    }
    layer.isFrozen = (layer.flags & 1) !== 0;
    layer.isLocked = (layer.flags & 4) !== 0;
  }
}

/**
 * Error thrown when DXF parsing fails.
 */
export class DxfParseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DxfParseError';
  }
}

/**
 * Parse a DXF file from string or ArrayBuffer.
 *
 * @throws {DxfParseError} If the input is empty, malformed, or cannot be parsed.
 */
export function parseDxf(input: string | ArrayBuffer): DxfDocument {
  // Validate input
  if (typeof input === 'string') {
    if (input.length === 0) {
      throw new DxfParseError('Input is empty. Expected a DXF string or ArrayBuffer.');
    }
  } else if (input instanceof ArrayBuffer) {
    if (input.byteLength === 0) {
      throw new DxfParseError('Input ArrayBuffer is empty.');
    }
  } else {
    throw new DxfParseError('Invalid input type. Expected a string or ArrayBuffer.');
  }

  let text: string;
  try {
    text = decodeInput(input);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Binary DXF')) {
      throw err; // Re-throw binary DXF error as-is
    }
    throw new DxfParseError('Failed to decode DXF input.', err);
  }

  let tokens: ReturnType<typeof tokenize>;
  try {
    tokens = tokenize(text);
  } catch (err) {
    throw new DxfParseError('Failed to tokenize DXF content.', err);
  }

  if (tokens.length === 0) {
    throw new DxfParseError('DXF content produced no tokens. The input may not be a valid DXF file.');
  }

  const doc: DxfDocument = {
    header: createDefaultHeader(),
    layers: new Map(),
    lineTypes: new Map(),
    styles: new Map(),
    blocks: new Map(),
    entities: [],
  };

  try {
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i]!;

      if (token.code === 0 && token.value === 'SECTION') {
        i++;
        if (i >= tokens.length) break;
        const sectionName = tokens[i]!.value;
        i++;

        switch (sectionName) {
          case 'HEADER':
            i = parseHeader(tokens, i, doc.header);
            break;
          case 'TABLES':
            i = parseTables(tokens, i, doc);
            break;
          case 'BLOCKS':
            i = parseBlocks(tokens, i, doc.blocks);
            break;
          case 'ENTITIES':
            i = parseEntities(tokens, i, doc.entities);
            break;
          default:
            // Skip CLASSES, OBJECTS, THUMBNAILIMAGE, etc.
            i = skipSection(tokens, i);
            break;
        }
      } else if (token.code === 0 && token.value === 'EOF') {
        break;
      } else {
        i++;
      }
    }
  } catch (err) {
    throw new DxfParseError('Failed to parse DXF sections.', err);
  }

  // Post-processing
  ensureDefaultLayer(doc);
  computeDerivedLayerFlags(doc);

  return doc;
}
