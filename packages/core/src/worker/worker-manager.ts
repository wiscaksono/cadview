/**
 * Manages a Web Worker for off-main-thread DXF parsing.
 *
 * The worker code is inlined at build time via the `__WORKER_CODE__` constant
 * (replaced by tsup `define`). At runtime the manager creates a Blob URL,
 * spawns the Worker lazily on the first `parse()` call, and terminates it on
 * `terminate()`.
 */
import type { DxfDocument } from '../parser/types.js';

declare const __WORKER_CODE__: string;

interface PendingRequest {
  resolve: (doc: DxfDocument) => void;
  reject: (err: Error) => void;
}

export class WorkerManager {
  private worker: Worker | null = null;
  private blobUrl: string | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();

  /**
   * Lazily create the Worker from the inlined code.
   */
  private getWorker(): Worker {
    if (this.worker) return this.worker;

    this.blobUrl = URL.createObjectURL(
      new Blob([__WORKER_CODE__], { type: 'text/javascript' }),
    );
    this.worker = new Worker(this.blobUrl);

    this.worker.onmessage = (e: MessageEvent) => {
      const { type, id, doc, message } = e.data;
      const req = this.pending.get(id);
      if (!req) return;
      this.pending.delete(id);

      if (type === 'result') {
        // Structured clone transfers Maps correctly, but we need to
        // reconstruct them if the browser serialized them as plain objects.
        req.resolve(this.reviveDocument(doc));
      } else if (type === 'error') {
        req.reject(new Error(message ?? 'Worker parse failed'));
      }
    };

    this.worker.onerror = (e: ErrorEvent) => {
      // Reject all pending requests on unhandled worker error
      const err = new Error(e.message ?? 'Worker error');
      for (const [, req] of this.pending) {
        req.reject(err);
      }
      this.pending.clear();
    };

    return this.worker;
  }

  /**
   * Parse a DXF input in the Worker thread.
   *
   * If `input` is an ArrayBuffer it is transferred (zero-copy) to the Worker.
   * The caller must not use the ArrayBuffer after calling this method.
   */
  parse(input: string | ArrayBuffer): Promise<DxfDocument> {
    return new Promise<DxfDocument>((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });

      const worker = this.getWorker();
      const msg = { type: 'parse', id, payload: input };

      if (input instanceof ArrayBuffer) {
        worker.postMessage(msg, [input]);
      } else {
        worker.postMessage(msg);
      }
    });
  }

  /**
   * Terminate the Worker and release the Blob URL.
   * Rejects all pending requests.
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }

    // Reject pending requests
    const err = new Error('Worker terminated');
    for (const [, req] of this.pending) {
      req.reject(err);
    }
    this.pending.clear();
  }

  /**
   * Revive a DxfDocument after structured clone.
   *
   * Structured clone preserves Map instances in modern browsers, but some
   * older environments may serialize them as plain objects. This method
   * ensures all expected Map fields are actual Maps.
   */
  private reviveDocument(doc: any): DxfDocument {
    return {
      ...doc,
      layers: this.ensureMap(doc.layers),
      lineTypes: this.ensureMap(doc.lineTypes),
      styles: this.ensureMap(doc.styles),
      blocks: this.ensureMap(doc.blocks),
    };
  }

  private ensureMap<K, V>(value: unknown): Map<K, V> {
    if (value instanceof Map) return value;
    if (value && typeof value === 'object') {
      return new Map(Object.entries(value)) as Map<K, V>;
    }
    return new Map();
  }
}
