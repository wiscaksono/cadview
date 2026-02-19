import type { DxfToken } from '../tokenizer.js';
import type { DxfDocument, DxfLayer, DxfLineType, DxfStyle } from '../types.js';

export function parseTables(tokens: DxfToken[], i: number, doc: DxfDocument): number {
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.code === 0 && token.value === 'ENDSEC') return i + 1;

    if (token.code === 0 && token.value === 'TABLE') {
      i++;
      if (i >= tokens.length) break;
      // code 2 = table type name
      const tableType = tokens[i]!.value;
      i++;

      switch (tableType) {
        case 'LAYER':
          i = parseLayerTable(tokens, i, doc.layers);
          break;
        case 'LTYPE':
          i = parseLTypeTable(tokens, i, doc.lineTypes);
          break;
        case 'STYLE':
          i = parseStyleTable(tokens, i, doc.styles);
          break;
        default:
          // Skip unknown tables
          i = skipTable(tokens, i);
          break;
      }
    } else {
      i++;
    }
  }
  return i;
}

function skipTable(tokens: DxfToken[], i: number): number {
  while (i < tokens.length) {
    if (tokens[i]!.code === 0 && tokens[i]!.value === 'ENDTAB') return i + 1;
    i++;
  }
  return i;
}

function parseLayerTable(tokens: DxfToken[], i: number, layers: Map<string, DxfLayer>): number {
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.code === 0 && token.value === 'ENDTAB') return i + 1;

    if (token.code === 0 && token.value === 'LAYER') {
      i++;
      const layer: DxfLayer = {
        name: '0',
        color: 7,
        lineType: 'Continuous',
        flags: 0,
        lineWeight: -3,
        isOff: false,
        isFrozen: false,
        isLocked: false,
      };

      while (i < tokens.length && tokens[i]!.code !== 0) {
        const tag = tokens[i]!;
        switch (tag.code) {
          case 2:   layer.name = tag.value; break;
          case 6:   layer.lineType = tag.value; break;
          case 62:  layer.color = parseInt(tag.value, 10); break;
          case 70:  layer.flags = parseInt(tag.value, 10); break;
          case 370: layer.lineWeight = parseInt(tag.value, 10); break;
          case 420: layer.trueColor = parseInt(tag.value, 10); break;
        }
        i++;
      }

      layers.set(layer.name, layer);
    } else {
      i++;
    }
  }
  return i;
}

function parseLTypeTable(tokens: DxfToken[], i: number, lineTypes: Map<string, DxfLineType>): number {
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.code === 0 && token.value === 'ENDTAB') return i + 1;

    if (token.code === 0 && token.value === 'LTYPE') {
      i++;
      const lt: DxfLineType = {
        name: '',
        description: '',
        pattern: [],
        totalLength: 0,
      };

      while (i < tokens.length && tokens[i]!.code !== 0) {
        const tag = tokens[i]!;
        switch (tag.code) {
          case 2:  lt.name = tag.value; break;
          case 3:  lt.description = tag.value; break;
          case 40: lt.totalLength = parseFloat(tag.value); break;
          case 49: lt.pattern.push(parseFloat(tag.value)); break;
        }
        i++;
      }

      if (lt.name) lineTypes.set(lt.name, lt);
    } else {
      i++;
    }
  }
  return i;
}

function parseStyleTable(tokens: DxfToken[], i: number, styles: Map<string, DxfStyle>): number {
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.code === 0 && token.value === 'ENDTAB') return i + 1;

    if (token.code === 0 && token.value === 'STYLE') {
      i++;
      const style: DxfStyle = {
        name: '',
        fontName: '',
        bigFontName: '',
        height: 0,
        widthFactor: 1,
        obliqueAngle: 0,
      };

      while (i < tokens.length && tokens[i]!.code !== 0) {
        const tag = tokens[i]!;
        switch (tag.code) {
          case 2:  style.name = tag.value; break;
          case 3:  style.fontName = tag.value; break;
          case 4:  style.bigFontName = tag.value; break;
          case 40: style.height = parseFloat(tag.value); break;
          case 41: style.widthFactor = parseFloat(tag.value); break;
          case 50: style.obliqueAngle = parseFloat(tag.value); break;
        }
        i++;
      }

      if (style.name) styles.set(style.name, style);
    } else {
      i++;
    }
  }
  return i;
}
