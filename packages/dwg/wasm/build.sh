#!/bin/bash
#
# Build LibreDWG as a WASM module using Emscripten.
#
# Prerequisites:
#   - Emscripten SDK (emsdk) installed and activated
#   - LibreDWG source as a git submodule in wasm/libredwg/
#
# Usage:
#   cd packages/dwg
#   pnpm build:wasm
#
# Output:
#   dist/libredwg.js   — Emscripten JS glue code
#   dist/libredwg.wasm — Compiled WASM binary
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
LIBREDWG_DIR="$SCRIPT_DIR/libredwg"
OUTPUT_DIR="$SCRIPT_DIR/../dist"

echo "=== @cadview/dwg WASM build ==="
echo ""

# --- Preflight checks ---

if [ ! -f "$LIBREDWG_DIR/CMakeLists.txt" ]; then
    echo "Error: LibreDWG submodule not initialized."
    echo ""
    echo "Run the following from the project root:"
    echo "  git submodule update --init --recursive"
    echo ""
    echo "Or manually clone LibreDWG:"
    echo "  git clone https://github.com/LibreDWG/libredwg.git $LIBREDWG_DIR"
    exit 1
fi

if ! command -v emcc &> /dev/null; then
    echo "Error: Emscripten (emcc) not found in PATH."
    echo ""
    echo "Install Emscripten SDK:"
    echo "  brew install emscripten"
    echo ""
    echo "Or from source:"
    echo "  https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

echo "LibreDWG: $LIBREDWG_DIR"
echo "Build dir: $BUILD_DIR"
echo "Output dir: $OUTPUT_DIR"
echo ""

mkdir -p "$BUILD_DIR" "$OUTPUT_DIR"

# --- Step 1: Build LibreDWG with Emscripten ---

echo "[1/2] Building LibreDWG with Emscripten..."
cd "$BUILD_DIR"

emcmake cmake "$LIBREDWG_DIR" \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF \
    -DLIBREDWG_LIBONLY=ON \
    -DLIBREDWG_DISABLE_JSON=ON \
    -DENABLE_LTO=OFF \
    -DDISABLE_WERROR=ON

# Detect available CPU cores for parallel build
NPROC=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

# Target name is "redwg" on non-MSVC (produces libredwg.a)
emmake make -j"$NPROC" redwg

echo ""

# --- Step 2: Compile C wrapper + link against LibreDWG → WASM ---

echo "[2/2] Compiling WASM module..."

emcc "$SCRIPT_DIR/wrapper.c" \
    -I"$LIBREDWG_DIR/include" \
    -I"$LIBREDWG_DIR/src" \
    -I"$BUILD_DIR/src" \
    -I"$LIBREDWG_DIR" \
    -L"$BUILD_DIR" \
    -lredwg \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_convert","_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["FS","ccall"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME='createLibreDWG' \
    -s FILESYSTEM=1 \
    -s INITIAL_MEMORY=33554432 \
    -s ASSERTIONS=0 \
    -Oz \
    -flto \
    -o "$OUTPUT_DIR/libredwg.js"

echo ""

# --- Step 3: Vendor the glue JS into src/ for static import ---

echo "[3/3] Vendoring Emscripten glue to src/vendor/..."

VENDOR_DIR="$SCRIPT_DIR/../src/vendor"
mkdir -p "$VENDOR_DIR"
cp "$OUTPUT_DIR/libredwg.js" "$VENDOR_DIR/create-libredwg.js"

echo ""
echo "=== Build complete ==="
echo ""
echo "Output files:"
ls -lh "$OUTPUT_DIR/libredwg.js" "$OUTPUT_DIR/libredwg.wasm" "$VENDOR_DIR/create-libredwg.js"
echo ""
echo "dist/libredwg.wasm — included in npm package (served via CDN)"
echo "src/vendor/create-libredwg.js — vendored glue, bundled by tsup into dist/index.js"
