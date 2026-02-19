import type { DxfToken } from '../tokenizer.js';
import type { DxfEntity, DxfLwPolylineVertex, DxfAttrib } from '../types.js';
import { parseLine } from '../entities/line.js';
import { parseCircle } from '../entities/circle.js';
import { parseArc } from '../entities/arc.js';
import { parseLwPolyline } from '../entities/lwpolyline.js';
import { parsePolyline } from '../entities/polyline.js';
import { parseEllipse } from '../entities/ellipse.js';
import { parseSpline } from '../entities/spline.js';
import { parseText } from '../entities/text.js';
import { parseMText } from '../entities/mtext.js';
import { parseInsert } from '../entities/insert.js';
import { parseDimension } from '../entities/dimension.js';
import { parseHatch } from '../entities/hatch.js';
import { parsePoint } from '../entities/point.js';

export function parseEntities(tokens: DxfToken[], i: number, entities: DxfEntity[]): number {
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.code !== 0) { i++; continue; }

    const type = token.value;
    if (type === 'ENDSEC' || type === 'ENDBLK') return i + 1;

    i++; // advance past (0, TYPE)

    // Collect all tags until next code 0
    const entityTags: DxfToken[] = [];
    while (i < tokens.length && tokens[i]!.code !== 0) {
      entityTags.push(tokens[i]!);
      i++;
    }

    switch (type) {
      case 'LINE':
        entities.push(parseLine(entityTags));
        break;
      case 'CIRCLE':
        entities.push(parseCircle(entityTags));
        break;
      case 'ARC':
        entities.push(parseArc(entityTags));
        break;
      case 'LWPOLYLINE':
        entities.push(parseLwPolyline(entityTags));
        break;
      case 'ELLIPSE':
        entities.push(parseEllipse(entityTags));
        break;
      case 'SPLINE':
        entities.push(parseSpline(entityTags));
        break;
      case 'TEXT':
        entities.push(parseText(entityTags));
        break;
      case 'MTEXT':
        entities.push(parseMText(entityTags));
        break;
      case 'INSERT': {
        const insert = parseInsert(entityTags);
        // Check if code 66=1 is in tags (ATTRIBs follow)
        const hasAttribs = entityTags.some(t => t.code === 66 && t.value === '1');
        if (hasAttribs) {
          i = parseAttribs(tokens, i, insert.attribs);
        }
        entities.push(insert);
        break;
      }
      case 'DIMENSION':
        entities.push(parseDimension(entityTags));
        break;
      case 'HATCH':
        entities.push(parseHatch(entityTags));
        break;
      case 'POINT':
        entities.push(parsePoint(entityTags));
        break;
      case 'POLYLINE': {
        const polyline = parsePolyline(entityTags);
        // Read VERTEX entities until SEQEND
        i = parseVertices(tokens, i, polyline.vertices);
        entities.push(polyline);
        break;
      }
      // Unknown entity types are silently skipped
      default:
        break;
    }
  }
  return i;
}

/**
 * Parse VERTEX entities following a POLYLINE until SEQEND.
 */
function parseVertices(tokens: DxfToken[], i: number, vertices: DxfLwPolylineVertex[]): number {
  while (i < tokens.length) {
    if (tokens[i]!.code !== 0) { i++; continue; }

    const type = tokens[i]!.value;
    if (type === 'SEQEND') return i + 1;
    if (type === 'ENDSEC' || type === 'ENDBLK') return i; // unexpected end

    if (type === 'VERTEX') {
      i++;
      const vertex: DxfLwPolylineVertex = { x: 0, y: 0, bulge: 0, startWidth: 0, endWidth: 0 };
      while (i < tokens.length && tokens[i]!.code !== 0) {
        const tag = tokens[i]!;
        switch (tag.code) {
          case 10: vertex.x = parseFloat(tag.value); break;
          case 20: vertex.y = parseFloat(tag.value); break;
          case 42: vertex.bulge = parseFloat(tag.value); break;
          case 40: vertex.startWidth = parseFloat(tag.value); break;
          case 41: vertex.endWidth = parseFloat(tag.value); break;
        }
        i++;
      }
      vertices.push(vertex);
    } else {
      // Skip unexpected entity type within POLYLINE
      i++;
      while (i < tokens.length && tokens[i]!.code !== 0) i++;
    }
  }
  return i;
}

/**
 * Parse ATTRIB entities following an INSERT (code 66=1) until SEQEND.
 */
function parseAttribs(tokens: DxfToken[], i: number, attribs: DxfAttrib[]): number {
  while (i < tokens.length) {
    if (tokens[i]!.code !== 0) { i++; continue; }

    const type = tokens[i]!.value;
    if (type === 'SEQEND') return i + 1;
    if (type === 'ENDSEC' || type === 'ENDBLK') return i; // unexpected end

    if (type === 'ATTRIB') {
      i++;
      const attrib: DxfAttrib = {
        tag: '',
        text: '',
        insertionPoint: { x: 0, y: 0, z: 0 },
        height: 1,
        rotation: 0,
        style: 'STANDARD',
        layer: '0',
        color: 256,
      };
      while (i < tokens.length && tokens[i]!.code !== 0) {
        const tag = tokens[i]!;
        switch (tag.code) {
          case 1:  attrib.text = tag.value; break;
          case 2:  attrib.tag = tag.value; break;
          case 7:  attrib.style = tag.value; break;
          case 8:  attrib.layer = tag.value; break;
          case 10: attrib.insertionPoint.x = parseFloat(tag.value); break;
          case 20: attrib.insertionPoint.y = parseFloat(tag.value); break;
          case 30: attrib.insertionPoint.z = parseFloat(tag.value); break;
          case 40: attrib.height = parseFloat(tag.value); break;
          case 50: attrib.rotation = parseFloat(tag.value); break;
          case 62: attrib.color = parseInt(tag.value, 10); break;
        }
        i++;
      }
      attribs.push(attrib);
    } else {
      // Skip unexpected entity type
      i++;
      while (i < tokens.length && tokens[i]!.code !== 0) i++;
    }
  }
  return i;
}
