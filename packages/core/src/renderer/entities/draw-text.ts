import type { DxfTextEntity, DxfMTextEntity } from '../../parser/types.js';

const CAD_FONT_MAP: Record<string, string> = {
  'standard':     'Arial, sans-serif',
  'arial':        'Arial, sans-serif',
  'arial.ttf':    'Arial, sans-serif',
  'romans.shx':   '"Courier New", monospace',
  'simplex.shx':  '"Courier New", monospace',
  'txt.shx':      'monospace',
  'monotxt.shx':  'monospace',
  'isocp.shx':    '"Courier New", monospace',
  'isocpeur.shx': '"Courier New", monospace',
  'times.ttf':    '"Times New Roman", serif',
  'timesnr.ttf':  '"Times New Roman", serif',
  'gothic.ttf':   '"Century Gothic", sans-serif',
};

function mapCADFont(styleName: string): string {
  const key = styleName.toLowerCase().trim();
  return CAD_FONT_MAP[key] || 'sans-serif';
}

export function drawText(ctx: CanvasRenderingContext2D, entity: DxfTextEntity, pixelSize: number): void {
  if (!entity.text || entity.height < pixelSize * 4) return; // skip unreadable text (< 4px)

  // Determine insertion point
  const useAlignPoint = entity.hAlign !== 0 || entity.vAlign !== 0;
  const px = useAlignPoint && entity.alignmentPoint
    ? entity.alignmentPoint.x
    : entity.insertionPoint.x;
  const py = useAlignPoint && entity.alignmentPoint
    ? entity.alignmentPoint.y
    : entity.insertionPoint.y;

  ctx.save();

  // Move to insertion point (in world coords, already flipped)
  ctx.translate(px, py);

  // Un-flip Y for text rendering
  ctx.scale(1, -1);

  // Apply entity rotation (degrees -> radians, negate because Y was flipped)
  if (entity.rotation) {
    ctx.rotate(-entity.rotation * Math.PI / 180);
  }

  // Apply width factor as horizontal scale
  if (entity.widthFactor !== 1.0) {
    ctx.scale(entity.widthFactor, 1);
  }

  // Apply oblique angle as skew
  if (entity.obliqueAngle) {
    const skew = Math.tan(entity.obliqueAngle * Math.PI / 180);
    ctx.transform(1, 0, skew, 1, 0, 0);
  }

  // Generation flags
  const backward = (entity.generationFlags & 2) !== 0;
  const upsideDown = (entity.generationFlags & 4) !== 0;
  if (backward) ctx.scale(-1, 1);
  if (upsideDown) ctx.scale(1, -1);

  // Font
  const fontName = mapCADFont(entity.style || 'Standard');
  ctx.font = `${entity.height}px ${fontName}`;

  // Horizontal alignment
  switch (entity.hAlign) {
    case 0: ctx.textAlign = 'left'; break;
    case 1: ctx.textAlign = 'center'; break;
    case 2: ctx.textAlign = 'right'; break;
    case 3: ctx.textAlign = 'left'; break;   // ALIGNED
    case 4: ctx.textAlign = 'center'; break;  // MIDDLE
    case 5: ctx.textAlign = 'left'; break;   // FIT
    default: ctx.textAlign = 'left';
  }

  // Vertical alignment
  switch (entity.vAlign) {
    case 0: ctx.textBaseline = 'alphabetic'; break;
    case 1: ctx.textBaseline = 'bottom'; break;
    case 2: ctx.textBaseline = 'middle'; break;
    case 3: ctx.textBaseline = 'top'; break;
    default: ctx.textBaseline = 'alphabetic';
  }

  ctx.fillText(entity.text, 0, 0);
  ctx.restore();
}

/**
 * Strip MTEXT formatting codes for basic text rendering.
 */
function stripMTextFormatting(text: string): string {
  return text
    .replace(/\\P/g, '\n')                        // paragraph break
    .replace(/\\[fFHWQTCAaLlOoKk][^;]*;/g, '')   // formatting commands with ;
    .replace(/\\\\/g, '\\')                        // escaped backslash
    .replace(/\\~/g, '\u00A0')                     // non-breaking space
    .replace(/\{/g, '')                             // scope open
    .replace(/\}/g, '')                             // scope close
    .replace(/\\S[^;]*;/g, '')                      // stacked fractions
    .trim();
}

export function drawMText(ctx: CanvasRenderingContext2D, entity: DxfMTextEntity, pixelSize: number): void {
  if (!entity.text || entity.height < pixelSize * 4) return; // skip unreadable text (< 4px)

  ctx.save();
  ctx.translate(entity.insertionPoint.x, entity.insertionPoint.y);
  ctx.scale(1, -1); // un-flip Y

  // Rotation: text direction overrides rotation angle
  const rotation = entity.textDirection
    ? Math.atan2(entity.textDirection.y, entity.textDirection.x)
    : (entity.rotation || 0) * Math.PI / 180;
  if (rotation) ctx.rotate(-rotation);

  // Parse text and strip formatting for v1 (basic implementation)
  const plainText = stripMTextFormatting(entity.text);
  const lines = plainText.split('\n');

  const lineHeight = entity.height * (entity.lineSpacingFactor || 1.4);
  const fontName = mapCADFont(entity.style || 'Standard');
  ctx.font = `${entity.height}px ${fontName}`;

  // Attachment point alignment
  // 1=TL, 2=TC, 3=TR, 4=ML, 5=MC, 6=MR, 7=BL, 8=BC, 9=BR
  const col = ((entity.attachmentPoint - 1) % 3); // 0=left, 1=center, 2=right
  const row = Math.floor((entity.attachmentPoint - 1) / 3); // 0=top, 1=middle, 2=bottom
  const alignments: CanvasTextAlign[] = ['left', 'center', 'right'];
  ctx.textAlign = alignments[col] ?? 'left';

  // Vertical offset based on attachment row
  let startY = 0;
  const totalHeight = lines.length * lineHeight;
  switch (row) {
    case 0: startY = entity.height; break;  // top: first line baseline
    case 1: startY = entity.height - totalHeight / 2; break; // middle
    case 2: startY = entity.height - totalHeight; break; // bottom
  }

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i]!, 0, startY + i * lineHeight);
  }

  ctx.restore();
}
