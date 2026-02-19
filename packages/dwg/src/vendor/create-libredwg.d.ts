/**
 * Type declarations for the vendored Emscripten-generated LibreDWG glue code.
 *
 * This file is NOT auto-generated — update manually if the C wrapper's
 * exported functions change.
 */

/**
 * Emscripten virtual filesystem (MEMFS) subset used by the converter.
 */
interface EmscriptenFS {
  writeFile(path: string, data: Uint8Array): void;
  readFile(path: string, opts: { encoding: 'utf8' }): string;
  unlink(path: string): void;
}

/**
 * The Emscripten-compiled LibreDWG module instance.
 */
export interface LibreDWGModule {
  FS: EmscriptenFS;
  ccall(
    ident: string,
    returnType: string,
    argTypes: string[],
    args: unknown[],
  ): number;
}

/**
 * Options passed to the Emscripten module factory.
 */
export interface CreateModuleOptions {
  locateFile?: (file: string, scriptDirectory: string) => string;
  [key: string]: unknown;
}

/**
 * Factory function exported by the Emscripten glue code.
 * Instantiates the WASM module with the given options.
 */
declare function createLibreDWG(
  options?: CreateModuleOptions,
): Promise<LibreDWGModule>;

export default createLibreDWG;
