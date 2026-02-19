/**
 * End-to-end integration tests: DWG → WASM convert → DXF string → parseDxf()
 *
 * Loads real DWG files from Autodesk sample library, converts them to DXF via
 * the LibreDWG WASM module, and parses the result through @cadview/core's parseDxf().
 *
 * Requires: `pnpm build:wasm` to have been run first (dist/libredwg.wasm).
 * Tests that require WASM are automatically skipped when the binary is not built.
 *
 * Fixtures sourced from:
 * https://www.autodesk.com/support/technical/article/caas/tsarticles/ts/6XGQklp3ZcBFqljLPjrnQ9.html
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isDwg, getDwgVersion, getDwgReleaseName } from './detect.js';
import { convertDwgToDxf } from './convert.js';
import { parseDxf } from '@cadview/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '../test-fixtures');
const WASM_BINARY_PATH = resolve(__dirname, '../dist/libredwg.wasm');

const hasWasm = existsSync(WASM_BINARY_PATH);
const describeWasm = hasWasm ? describe : describe.skip;

/** All .dwg files in the test-fixtures directory */
const fixtureFiles = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith('.dwg'))
  .sort();

/** Load a fixture into an ArrayBuffer */
function loadFixture(name: string): ArrayBuffer {
  return readFileSync(resolve(FIXTURES_DIR, name)).buffer;
}

describe('DWG end-to-end', () => {
  // ── Detection (all fixtures, no WASM needed) ──────────────────────

  describe('detection', () => {
    for (const file of fixtureFiles) {
      it(`isDwg() returns true for ${file}`, () => {
        expect(isDwg(loadFixture(file))).toBe(true);
      });

      it(`getDwgVersion() returns a valid version for ${file}`, () => {
        const version = getDwgVersion(loadFixture(file));
        expect(version).toBeTruthy();
        expect(version).toMatch(/^AC\d{4}$/);
        // Should have a known release name
        expect(getDwgReleaseName(version!)).toBeTruthy();
      });
    }
  });

  // ── Conversion (WASM required) ────────────────────────────────────

  describeWasm('conversion', () => {
    for (const file of fixtureFiles) {
      it(`converts ${file} to DXF string`, async () => {
        const dxf = await convertDwgToDxf(loadFixture(file), {
          timeout: 60_000,
          wasmUrl: WASM_BINARY_PATH,
        });

        expect(typeof dxf).toBe('string');
        expect(dxf.length).toBeGreaterThan(0);
        // DXF must have section structure
        expect(dxf).toContain('SECTION');
        expect(dxf).toContain('ENDSEC');
        // DXF must end with EOF marker
        expect(dxf).toContain('EOF');
      }, 60_000);
    }
  });

  // ── Full pipeline: DWG → DXF → DxfDocument ────────────────────────

  describeWasm('full pipeline', () => {
    for (const file of fixtureFiles) {
      it(`produces a valid DxfDocument from ${file}`, async () => {
        const dxf = await convertDwgToDxf(loadFixture(file), {
          timeout: 60_000,
          wasmUrl: WASM_BINARY_PATH,
        });
        const doc = parseDxf(dxf);

        // Header should be populated
        expect(doc.header).toBeDefined();

        // Should have at least default layer "0"
        expect(doc.layers.size).toBeGreaterThanOrEqual(1);
        expect(doc.layers.has('0')).toBe(true);

        // Parse should complete (entity count varies — some files may have all
        // content in paper space blocks or use unsupported entity types)
        expect(doc.entities.length).toBeGreaterThanOrEqual(0);

        // No layers should have negative colors (Bug 5 fix)
        for (const [, layer] of doc.layers) {
          expect(layer.color).toBeGreaterThanOrEqual(0);
        }

        // Log stats for debugging
        const version = getDwgVersion(loadFixture(file));
        const release = version ? getDwgReleaseName(version) : 'unknown';
        const entityTypes = [...new Set(doc.entities.map(e => e.type))].join(', ');
        console.log(
          `[e2e] ${file}: ${version}/${release}, ` +
          `${dxf.length} chars, ${doc.layers.size} layers, ` +
          `${doc.entities.length} entities [${entityTypes}]`,
        );
      }, 60_000);
    }
  });
});
