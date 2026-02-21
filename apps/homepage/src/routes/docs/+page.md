---
title: Introduction
description: Zero-dependency CAD file viewer for the browser. Parses DXF files, renders on Canvas 2D, with pan, select, and measure tools.
---

# @cadview Documentation

<p class="subtitle">// framework-agnostic CAD/DXF/DWG viewer for the web</p>

**@cadview** is a zero-dependency CAD file viewer that runs entirely in the browser. It parses DXF files, renders them on an HTML5 Canvas, and provides interactive tools for panning, selecting entities, and measuring distances.

## Architecture

The library is split into focused packages that you compose together:

| Package           | Description                         | License |
| ----------------- | ----------------------------------- | ------- |
| `@cadview/core`   | Parser, renderer, and viewer engine | MIT     |
| `@cadview/react`  | React 18/19 component & hook        | MIT     |
| `@cadview/svelte` | Svelte 5 component                  | MIT     |
| `@cadview/vue`    | Vue 3 component & composable        | MIT     |
| `@cadview/dwg`    | DWG file support via LibreDWG WASM  | GPL-3.0 |

The core package has only one runtime dependency ([rbush](https://github.com/mourner/rbush) for spatial indexing). Framework wrappers are thin bindings with zero additional dependencies.

## What you get

The parser handles 13 entity types and auto-detects encoding (UTF-8, Shift-JIS, GBK, EUC-KR, Big5). Parsing runs in a Web Worker so the main thread stays free.

Rendering is Canvas 2D with path batching, viewport culling, and sub-pixel optimization. Two built-in themes (dark and light) with a color resolution chain: entity &rarr; layer &rarr; default.

The viewer gives you pan, zoom, select, and measure tools out of the box. Touch works too &mdash; pinch-to-zoom, the whole thing. Layers can be toggled on/off or have their colors overridden.

DWG files are supported through `@cadview/dwg`, which lazy-loads a ~6&nbsp;MB WASM binary at runtime. It's a separate package because the license is GPL-3.0.

## Quick Links

- [Getting Started](/docs/getting-started) &mdash; Install and render your first DXF file
- [Core API](/docs/core-api) &mdash; `CadViewer` class reference
- [Framework Guides](/docs/frameworks) &mdash; React, Svelte, and Vue integration
- [DWG Support](/docs/dwg-support) &mdash; Enable DWG file loading
- [Supported Entities](/docs/entities) &mdash; Full list of supported DXF entities
- [Theming](/docs/theming) &mdash; Dark/light themes and customization
