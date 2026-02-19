export interface DxfToken {
  code: number;
  value: string;
}

/**
 * Fast tokenizer: splits raw DXF text into (code, value) pairs.
 * Uses indexOf scanning for performance on large files.
 * Handles \r\n, \n, and \r line endings.
 */
export function tokenize(content: string): DxfToken[] {
  // Normalize line endings
  const text = content.replace(/\r\n?/g, '\n');
  const tokens: DxfToken[] = [];
  const len = text.length;
  let pos = 0;

  while (pos < len) {
    // Skip empty lines
    while (pos < len && text.charCodeAt(pos) === 10) pos++;
    if (pos >= len) break;

    // Read group code line
    let lineEnd = text.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = len;
    const codeLine = text.substring(pos, lineEnd).trim();
    pos = lineEnd + 1;

    // Parse group code as integer
    const code = parseInt(codeLine, 10);
    if (isNaN(code)) {
      // Skip malformed pair — advance past value line too
      if (pos < len) {
        lineEnd = text.indexOf('\n', pos);
        if (lineEnd === -1) lineEnd = len;
        pos = lineEnd + 1;
      }
      continue;
    }

    // Read value line
    if (pos >= len) break;
    lineEnd = text.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = len;
    // Trim only trailing whitespace (preserve leading spaces — some values need them)
    const value = text.substring(pos, lineEnd).replace(/\s+$/, '');
    pos = lineEnd + 1;

    tokens.push({ code, value });
  }

  return tokens;
}

