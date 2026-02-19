import type { DxfToken } from '../tokenizer.js';
import type { DxfHeader, Point3D } from '../types.js';

export function parseHeader(tokens: DxfToken[], i: number, header: DxfHeader): number {
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.code === 0 && token.value === 'ENDSEC') return i + 1;

    if (token.code === 9) {
      const varName = token.value;
      i++;

      switch (varName) {
        case '$ACADVER':
          if (i < tokens.length) { header.acadVersion = tokens[i]!.value; i++; }
          break;
        case '$EXTMIN':
          if (i < tokens.length) {
            const result = readHeaderPoint3D(tokens, i);
            header.extMin = result.point;
            i = result.nextIndex;
          }
          break;
        case '$EXTMAX':
          if (i < tokens.length) {
            const result = readHeaderPoint3D(tokens, i);
            header.extMax = result.point;
            i = result.nextIndex;
          }
          break;
        case '$INSUNITS':
          if (i < tokens.length) { header.insUnits = parseInt(tokens[i]!.value, 10); i++; }
          break;
        case '$MEASUREMENT':
          if (i < tokens.length) { header.measurement = parseInt(tokens[i]!.value, 10); i++; }
          break;
        case '$LTSCALE':
          if (i < tokens.length) { header.ltScale = parseFloat(tokens[i]!.value); i++; }
          break;
        case '$DWGCODEPAGE':
          if (i < tokens.length) { header.dwgCodePage = tokens[i]!.value; i++; }
          break;
        case '$HANDSEED':
          if (i < tokens.length) { header.handleSeed = tokens[i]!.value; i++; }
          break;
        default:
          // Skip unknown variables by reading until next code 9 or code 0
          while (i < tokens.length && tokens[i]!.code !== 9 && tokens[i]!.code !== 0) {
            header[varName] = tokens[i]!.value;
            i++;
          }
      }
    } else {
      i++;
    }
  }
  return i;
}

function readHeaderPoint3D(tokens: DxfToken[], i: number): { point: Point3D; nextIndex: number } {
  const point: Point3D = { x: 0, y: 0, z: 0 };
  // Read codes 10/20/30 (or whatever X/Y/Z codes follow)
  while (i < tokens.length) {
    const code = tokens[i]!.code;
    if (code === 10) { point.x = parseFloat(tokens[i]!.value); i++; }
    else if (code === 20) { point.y = parseFloat(tokens[i]!.value); i++; }
    else if (code === 30) { point.z = parseFloat(tokens[i]!.value); i++; }
    else break;
  }
  return { point, nextIndex: i };
}
