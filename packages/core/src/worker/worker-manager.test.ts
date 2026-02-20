/**
 * Tests for WorkerManager — mocks Worker, Blob, and URL APIs since
 * they don't exist in the Node.js test environment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock __WORKER_CODE__ before importing WorkerManager
vi.stubGlobal('__WORKER_CODE__', 'self.onmessage = function() {}');

// ============================================================
// Mock Web APIs
// ============================================================

type MessageHandler = (e: { data: any }) => void;
type ErrorHandler = (e: { message: string }) => void;

interface MockWorkerInstance {
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  onmessage: MessageHandler | null;
  onerror: ErrorHandler | null;
  /** Simulate a message from the worker back to the main thread. */
  _simulateMessage(data: any): void;
  /** Simulate an error event from the worker. */
  _simulateError(message: string): void;
}

let mockWorkerInstances: MockWorkerInstance[] = [];

function createMockWorkerClass() {
  return vi.fn().mockImplementation(() => {
    const instance: MockWorkerInstance = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
      _simulateMessage(data: any) {
        this.onmessage?.({ data });
      },
      _simulateError(message: string) {
        this.onerror?.({ message });
      },
    };
    mockWorkerInstances.push(instance);
    return instance;
  });
}

function setupGlobals() {
  (globalThis as any).Worker = createMockWorkerClass();
  (globalThis as any).Blob = vi.fn().mockImplementation(() => ({}));
  (globalThis as any).URL = {
    ...globalThis.URL,
    createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
    revokeObjectURL: vi.fn(),
  };
}

function teardownGlobals() {
  mockWorkerInstances = [];
  delete (globalThis as any).Worker;
  // Restore URL if needed
}

// ============================================================
// Tests
// ============================================================

describe('WorkerManager', () => {
  let WorkerManager: typeof import('./worker-manager.js').WorkerManager;

  beforeEach(async () => {
    setupGlobals();
    // Fresh import to pick up mocked globals
    const mod = await import('./worker-manager.js');
    WorkerManager = mod.WorkerManager;
  });

  afterEach(() => {
    teardownGlobals();
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------
  // Lazy initialization
  // ----------------------------------------------------------

  describe('lazy initialization', () => {
    it('does not create a Worker on construction', () => {
      new WorkerManager();
      expect(mockWorkerInstances).toHaveLength(0);
    });

    it('creates a Worker on first parse() call', () => {
      const manager = new WorkerManager();
      manager.parse('test');
      expect(mockWorkerInstances).toHaveLength(1);
    });

    it('creates a Blob URL from inlined worker code', () => {
      const manager = new WorkerManager();
      manager.parse('test');
      expect(Blob).toHaveBeenCalledWith(
        ['self.onmessage = function() {}'],
        { type: 'text/javascript' },
      );
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('reuses the same Worker across multiple parse() calls', () => {
      const manager = new WorkerManager();
      manager.parse('test1');
      manager.parse('test2');
      expect(mockWorkerInstances).toHaveLength(1);
    });
  });

  // ----------------------------------------------------------
  // Successful parsing
  // ----------------------------------------------------------

  describe('parse — success', () => {
    it('resolves with the parsed document', async () => {
      const manager = new WorkerManager();
      const mockDoc = {
        header: { acadVersion: 'AC1027' },
        layers: new Map([['0', { name: '0' }]]),
        lineTypes: new Map(),
        styles: new Map(),
        blocks: new Map(),
        entities: [],
      };

      const promise = manager.parse('dxf-content');
      const worker = mockWorkerInstances[0]!;

      // Worker received the message
      expect(worker.postMessage).toHaveBeenCalledWith(
        { type: 'parse', id: 1, payload: 'dxf-content' },
      );

      // Simulate successful response
      worker._simulateMessage({ type: 'result', id: 1, doc: mockDoc });

      const result = await promise;
      expect(result.header.acadVersion).toBe('AC1027');
      expect(result.layers).toBeInstanceOf(Map);

      manager.terminate();
    });

    it('handles multiple concurrent parse requests', async () => {
      const manager = new WorkerManager();

      const promise1 = manager.parse('dxf1');
      const promise2 = manager.parse('dxf2');

      const worker = mockWorkerInstances[0]!;
      expect(worker.postMessage).toHaveBeenCalledTimes(2);

      // Respond out of order
      const mockDoc2 = {
        header: { acadVersion: 'AC1015' },
        layers: new Map(),
        lineTypes: new Map(),
        styles: new Map(),
        blocks: new Map(),
        entities: [{ type: 'LINE' }],
      };
      const mockDoc1 = {
        header: { acadVersion: 'AC1027' },
        layers: new Map(),
        lineTypes: new Map(),
        styles: new Map(),
        blocks: new Map(),
        entities: [],
      };

      worker._simulateMessage({ type: 'result', id: 2, doc: mockDoc2 });
      worker._simulateMessage({ type: 'result', id: 1, doc: mockDoc1 });

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1.header.acadVersion).toBe('AC1027');
      expect(result2.header.acadVersion).toBe('AC1015');

      manager.terminate();
    });
  });

  // ----------------------------------------------------------
  // ArrayBuffer transfer
  // ----------------------------------------------------------

  describe('ArrayBuffer transfer', () => {
    it('transfers ArrayBuffer to Worker via transferable', () => {
      const manager = new WorkerManager();
      const buffer = new ArrayBuffer(16);

      manager.parse(buffer).catch(() => {}); // pending — will be rejected on terminate

      const worker = mockWorkerInstances[0]!;
      expect(worker.postMessage).toHaveBeenCalledWith(
        { type: 'parse', id: 1, payload: buffer },
        [buffer],
      );

      manager.terminate();
    });

    it('does not use transferable for string input', () => {
      const manager = new WorkerManager();
      manager.parse('string-input').catch(() => {}); // pending — will be rejected on terminate

      const worker = mockWorkerInstances[0]!;
      expect(worker.postMessage).toHaveBeenCalledWith(
        { type: 'parse', id: 1, payload: 'string-input' },
      );

      manager.terminate();
    });
  });

  // ----------------------------------------------------------
  // Error handling
  // ----------------------------------------------------------

  describe('parse — error', () => {
    it('rejects when Worker responds with error message', async () => {
      const manager = new WorkerManager();
      const promise = manager.parse('bad-input');

      const worker = mockWorkerInstances[0]!;
      worker._simulateMessage({
        type: 'error',
        id: 1,
        message: 'Input is empty. Expected a DXF string or ArrayBuffer.',
      });

      await expect(promise).rejects.toThrow(
        'Input is empty. Expected a DXF string or ArrayBuffer.',
      );

      manager.terminate();
    });

    it('rejects all pending requests on unhandled Worker error', async () => {
      const manager = new WorkerManager();
      const promise1 = manager.parse('a');
      const promise2 = manager.parse('b');

      const worker = mockWorkerInstances[0]!;
      worker._simulateError('Worker crashed');

      await expect(promise1).rejects.toThrow('Worker crashed');
      await expect(promise2).rejects.toThrow('Worker crashed');

      manager.terminate();
    });

    it('recreates Worker after onerror and subsequent parse succeeds', async () => {
      const manager = new WorkerManager();

      // First parse — Worker will crash
      const promise1 = manager.parse('a');
      expect(mockWorkerInstances).toHaveLength(1);
      const brokenWorker = mockWorkerInstances[0]!;
      brokenWorker._simulateError('Worker crashed');
      await expect(promise1).rejects.toThrow('Worker crashed');

      // Broken Worker should have been terminated
      expect(brokenWorker.terminate).toHaveBeenCalled();

      // Second parse — should create a new Worker
      const promise2 = manager.parse('b');
      expect(mockWorkerInstances).toHaveLength(2);
      const newWorker = mockWorkerInstances[1]!;

      // New Worker responds successfully
      const call = newWorker.postMessage.mock.calls[0]!;
      newWorker._simulateMessage({
        type: 'result',
        id: call[0].id,
        doc: {
          header: {},
          layers: new Map(),
          lineTypes: new Map(),
          styles: new Map(),
          blocks: new Map(),
          entities: [],
        },
      });

      const result = await promise2;
      expect(result).toBeDefined();
      expect(result.layers).toBeInstanceOf(Map);

      manager.terminate();
    });

    it('rejects and cleans up when postMessage throws', async () => {
      const manager = new WorkerManager();

      // First call creates the Worker normally (id=1)
      const setupPromise = manager.parse('setup');
      const worker = mockWorkerInstances[0]!;

      worker._simulateMessage({
        type: 'result',
        id: 1,
        doc: {
          header: {},
          layers: new Map(),
          lineTypes: new Map(),
          styles: new Map(),
          blocks: new Map(),
          entities: [],
        },
      });
      await setupPromise;

      // Now make postMessage throw on next call (id=2)
      worker.postMessage.mockImplementationOnce(() => {
        throw new Error('DataCloneError: failed to serialize');
      });

      const failPromise = manager.parse('will-fail');
      await expect(failPromise).rejects.toThrow('DataCloneError: failed to serialize');

      // Subsequent parse should work (id=3) — postMessage restored
      const recoveryPromise = manager.parse('recovery');
      worker._simulateMessage({
        type: 'result',
        id: 3,
        doc: {
          header: {},
          layers: new Map(),
          lineTypes: new Map(),
          styles: new Map(),
          blocks: new Map(),
          entities: [],
        },
      });
      const result = await recoveryPromise;
      expect(result).toBeDefined();

      manager.terminate();
    });
  });

  // ----------------------------------------------------------
  // Map revival
  // ----------------------------------------------------------

  describe('Map revival', () => {
    it('preserves Map instances from structured clone', async () => {
      const manager = new WorkerManager();
      const promise = manager.parse('test');

      const worker = mockWorkerInstances[0]!;
      worker._simulateMessage({
        type: 'result',
        id: 1,
        doc: {
          header: {},
          layers: new Map([['0', { name: '0' }]]),
          lineTypes: new Map(),
          styles: new Map(),
          blocks: new Map(),
          entities: [],
        },
      });

      const result = await promise;
      expect(result.layers).toBeInstanceOf(Map);
      expect(result.layers.get('0')).toEqual({ name: '0' });

      manager.terminate();
    });

    it('revives plain objects to Maps (legacy browser fallback)', async () => {
      const manager = new WorkerManager();
      const promise = manager.parse('test');

      const worker = mockWorkerInstances[0]!;
      // Simulate a browser that serialized Maps as plain objects
      worker._simulateMessage({
        type: 'result',
        id: 1,
        doc: {
          header: {},
          layers: { '0': { name: '0' }, 'Layer1': { name: 'Layer1' } },
          lineTypes: {},
          styles: {},
          blocks: {},
          entities: [],
        },
      });

      const result = await promise;
      expect(result.layers).toBeInstanceOf(Map);
      expect(result.layers.size).toBe(2);
      expect(result.layers.get('0')).toEqual({ name: '0' });

      manager.terminate();
    });
  });

  // ----------------------------------------------------------
  // Terminate
  // ----------------------------------------------------------

  describe('terminate', () => {
    it('terminates the Worker', () => {
      const manager = new WorkerManager();
      const pending = manager.parse('test').catch(() => {}); // swallow expected rejection

      const worker = mockWorkerInstances[0]!;
      manager.terminate();

      expect(worker.terminate).toHaveBeenCalled();
    });

    it('revokes the Blob URL', () => {
      const manager = new WorkerManager();
      const pending = manager.parse('test').catch(() => {}); // swallow expected rejection
      manager.terminate();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('rejects pending requests on terminate', async () => {
      const manager = new WorkerManager();
      const promise = manager.parse('test');
      manager.terminate();

      await expect(promise).rejects.toThrow('Worker terminated');
    });

    it('is safe to call terminate multiple times', () => {
      const manager = new WorkerManager();
      const pending = manager.parse('test').catch(() => {}); // swallow expected rejection
      manager.terminate();
      manager.terminate(); // Should not throw

      expect(mockWorkerInstances[0]!.terminate).toHaveBeenCalledTimes(1);
    });

    it('is safe to call terminate without any parse calls', () => {
      const manager = new WorkerManager();
      manager.terminate(); // No Worker was created
      expect(mockWorkerInstances).toHaveLength(0);
    });

    it('parse() after terminate() creates a new Worker', async () => {
      const manager = new WorkerManager();

      // First parse — creates Worker
      const promise1 = manager.parse('first').catch(() => {});
      expect(mockWorkerInstances).toHaveLength(1);
      manager.terminate();
      expect(mockWorkerInstances[0]!.terminate).toHaveBeenCalled();

      // Second parse after terminate — should create a new Worker
      const promise2 = manager.parse('second');
      expect(mockWorkerInstances).toHaveLength(2);

      const newWorker = mockWorkerInstances[1]!;
      const call = newWorker.postMessage.mock.calls[0]!;
      newWorker._simulateMessage({
        type: 'result',
        id: call[0].id,
        doc: {
          header: {},
          layers: new Map(),
          lineTypes: new Map(),
          styles: new Map(),
          blocks: new Map(),
          entities: [],
        },
      });

      const result = await promise2;
      expect(result).toBeDefined();

      manager.terminate();
    });
  });

  // ----------------------------------------------------------
  // Ignores unknown messages
  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // __WORKER_CODE__ guard
  // ----------------------------------------------------------

  describe('__WORKER_CODE__ guard', () => {
    it('throws if __WORKER_CODE__ is not a string', async () => {
      const original = (globalThis as any).__WORKER_CODE__;
      (globalThis as any).__WORKER_CODE__ = undefined;

      try {
        const manager = new WorkerManager();
        await expect(manager.parse('test')).rejects.toThrow(
          'worker code not available',
        );
      } finally {
        (globalThis as any).__WORKER_CODE__ = original;
      }
    });

    it('throws if __WORKER_CODE__ is empty string', async () => {
      const original = (globalThis as any).__WORKER_CODE__;
      (globalThis as any).__WORKER_CODE__ = '';

      try {
        const manager = new WorkerManager();
        await expect(manager.parse('test')).rejects.toThrow(
          'worker code not available',
        );
      } finally {
        (globalThis as any).__WORKER_CODE__ = original;
      }
    });
  });

  // ----------------------------------------------------------
  // Ignores unknown messages
  // ----------------------------------------------------------

  describe('message handling', () => {
    it('ignores messages with unknown ids', async () => {
      const manager = new WorkerManager();
      const promise = manager.parse('test');

      const worker = mockWorkerInstances[0]!;
      // Send a message with wrong id — should be ignored
      worker._simulateMessage({ type: 'result', id: 999, doc: {} });

      // Now send correct response
      worker._simulateMessage({
        type: 'result',
        id: 1,
        doc: {
          header: {},
          layers: new Map(),
          lineTypes: new Map(),
          styles: new Map(),
          blocks: new Map(),
          entities: [],
        },
      });

      const result = await promise;
      expect(result).toBeDefined();

      manager.terminate();
    });
  });
});
