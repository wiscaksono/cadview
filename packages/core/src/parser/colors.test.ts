import { describe, it, expect } from 'vitest';
import { ACI_COLORS, aciToHex, aciToDisplayColor, trueColorToHex } from './colors.js';

describe('ACI_COLORS', () => {
  it('has 256 entries (indices 0-255)', () => {
    expect(ACI_COLORS).toHaveLength(256);
  });

  it('has standard named colors at correct indices', () => {
    expect(ACI_COLORS[1]).toBe('#FF0000');  // Red
    expect(ACI_COLORS[2]).toBe('#FFFF00');  // Yellow
    expect(ACI_COLORS[3]).toBe('#00FF00');  // Green
    expect(ACI_COLORS[4]).toBe('#00FFFF');  // Cyan
    expect(ACI_COLORS[5]).toBe('#0000FF');  // Blue
    expect(ACI_COLORS[6]).toBe('#FF00FF');  // Magenta
    expect(ACI_COLORS[7]).toBe('#FFFFFF');  // White
  });

  it('has grayscale ramp at indices 250-255', () => {
    expect(ACI_COLORS[250]).toBe('#333333');
    expect(ACI_COLORS[255]).toBe('#FFFFFF');
  });
});

describe('aciToHex', () => {
  it('returns hex string for valid ACI indices', () => {
    expect(aciToHex(1)).toBe('#FF0000');
    expect(aciToHex(7)).toBe('#FFFFFF');
    expect(aciToHex(255)).toBe('#FFFFFF');
  });

  it('returns undefined for BYBLOCK (0)', () => {
    expect(aciToHex(0)).toBeUndefined();
  });

  it('returns undefined for BYLAYER (256)', () => {
    expect(aciToHex(256)).toBeUndefined();
  });

  it('returns undefined for negative values', () => {
    expect(aciToHex(-1)).toBeUndefined();
    expect(aciToHex(-5)).toBeUndefined();
  });

  it('returns undefined for out-of-range values', () => {
    expect(aciToHex(257)).toBeUndefined();
    expect(aciToHex(1000)).toBeUndefined();
  });
});

describe('aciToDisplayColor', () => {
  it('returns white for color 7 on dark theme', () => {
    expect(aciToDisplayColor(7, true)).toBe('#FFFFFF');
  });

  it('returns black for color 7 on light theme', () => {
    expect(aciToDisplayColor(7, false)).toBe('#000000');
  });

  it('returns the ACI color for non-7 indices', () => {
    expect(aciToDisplayColor(1, true)).toBe('#FF0000');
    expect(aciToDisplayColor(1, false)).toBe('#FF0000');
  });

  it('handles negative ACI (layer OFF) with Math.abs', () => {
    expect(aciToDisplayColor(-1, true)).toBe('#FF0000');
    expect(aciToDisplayColor(-5, true)).toBe('#0000FF');
  });

  it('falls back to white on dark theme for invalid index', () => {
    expect(aciToDisplayColor(999, true)).toBe('#FFFFFF');
  });

  it('falls back to black on light theme for invalid index', () => {
    expect(aciToDisplayColor(999, false)).toBe('#000000');
  });
});

describe('trueColorToHex', () => {
  it('converts 24-bit integer to hex string', () => {
    expect(trueColorToHex(0xFF0000)).toBe('#ff0000');
    expect(trueColorToHex(0x00FF00)).toBe('#00ff00');
    expect(trueColorToHex(0x0000FF)).toBe('#0000ff');
  });

  it('converts white', () => {
    expect(trueColorToHex(0xFFFFFF)).toBe('#ffffff');
  });

  it('converts black', () => {
    expect(trueColorToHex(0x000000)).toBe('#000000');
  });

  it('pads single-digit hex values', () => {
    expect(trueColorToHex(0x010203)).toBe('#010203');
  });

  it('handles arbitrary color values', () => {
    // R=171 (0xAB), G=205 (0xCD), B=239 (0xEF)
    expect(trueColorToHex(0xABCDEF)).toBe('#abcdef');
  });
});
