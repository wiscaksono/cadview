/**
 * Thin C wrapper around LibreDWG for Emscripten WASM compilation.
 *
 * Exposes a single function: convert(input_path, output_path)
 * Both paths refer to files in the Emscripten MEMFS virtual filesystem.
 *
 * The JS bridge (convert.ts) writes DWG bytes to MEMFS, calls this function,
 * then reads the resulting DXF file from MEMFS.
 *
 * Build with: wasm/build.sh
 * Requires: Emscripten SDK (emsdk)
 */

#include <dwg.h>
#include "src/bits.h"
#include "src/out_dxf.h"
#include <emscripten.h>
#include <stdio.h>
#include <string.h>

/**
 * Convert a DWG file to DXF format using LibreDWG.
 *
 * @param input_path  Path to the input DWG file (in Emscripten MEMFS)
 * @param output_path Path for the output DXF file (in Emscripten MEMFS)
 * @return 0 on success, or a LibreDWG error code on failure.
 *         Error codes > DWG_ERR_CRITICAL indicate unrecoverable errors.
 */
EMSCRIPTEN_KEEPALIVE
int convert(const char* input_path, const char* output_path) {
    Dwg_Data dwg;
    memset(&dwg, 0, sizeof(Dwg_Data));

    /* Read the DWG file from MEMFS */
    int error = dwg_read_file(input_path, &dwg);
    if (error > DWG_ERR_CRITICAL) {
        dwg_free(&dwg);
        return error;
    }

    /* Set up output chain for DXF writing */
    Bit_Chain dat = { 0 };
    dat.version = dwg.header.version;
    dat.from_version = dwg.header.from_version;
    dat.fh = fopen(output_path, "wb");
    if (!dat.fh) {
        dwg_free(&dwg);
        return 1;
    }

    /* Write as ASCII DXF */
    error = dwg_write_dxf(&dat, &dwg);

    fclose(dat.fh);
    dwg_free(&dwg);
    return error;
}
