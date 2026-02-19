export { CadViewer, type CadViewerProps, type CadViewerRef } from './CadViewer.js';
export { useCadViewer } from './useCadViewer.js';

// Re-export core types for convenience
export type {
  FormatConverter,
  SelectEvent,
  MeasureEvent,
  ViewTransform,
  DxfLayer,
  DxfDocument,
  DxfEntity,
  Tool,
  Theme,
} from '@cadview/core';
