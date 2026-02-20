/**
 * Web Worker script for off-main-thread DXF parsing.
 *
 * This file is built as an IIFE by tsup (pass 1) and inlined as a string
 * constant into the main bundle. At runtime, WorkerManager creates a Blob URL
 * from the inlined code to spawn the Worker.
 *
 * Message protocol:
 *   Main → Worker:  { type: 'parse', id: number, payload: string | ArrayBuffer }
 *   Worker → Main:  { type: 'result', id: number, doc: DxfDocument }
 *                 | { type: 'error',  id: number, message: string }
 */
import { parseDxf } from '../parser/index.js';

self.onmessage = (e: MessageEvent) => {
  const { type, id, payload } = e.data;
  if (type !== 'parse') return;

  try {
    const doc = parseDxf(payload);
    postMessage({ type: 'result', id, doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    postMessage({ type: 'error', id, message });
  }
};
