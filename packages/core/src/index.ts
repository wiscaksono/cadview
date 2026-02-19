// @cadview/core - CAD file viewer engine

// Parser
export { parseDxf, DxfParseError } from './parser/index.js';
export type {
  DxfDocument,
  DxfHeader,
  DxfEntity,
  DxfEntityBase,
  DxfLineEntity,
  DxfCircleEntity,
  DxfArcEntity,
  DxfLwPolylineEntity,
  DxfLwPolylineVertex,
  DxfPolylineEntity,
  DxfEllipseEntity,
  DxfSplineEntity,
  DxfTextEntity,
  DxfMTextEntity,
  DxfInsertEntity,
  DxfDimensionEntity,
  DxfHatchEntity,
  DxfHatchBoundaryPath,
  DxfHatchEdge,
  DxfPointEntity,
  DxfAttrib,
  DxfLayer,
  DxfLineType,
  DxfBlock,
  DxfStyle,
  Point2D,
  Point3D,
} from './parser/types.js';

// Colors
export { aciToHex, aciToDisplayColor, trueColorToHex } from './parser/colors.js';

// Renderer
export type { ViewTransform, Theme, ThemeConfig } from './renderer/index.js';
export { CanvasRenderer, resolveEntityColor } from './renderer/index.js';
export { Camera, fitToView, worldToScreen, screenToWorld, zoomAtPoint, applyTransform } from './renderer/index.js';
export { drawEntity } from './renderer/index.js';
export { THEMES } from './renderer/index.js';

// Viewer
export { CadViewer } from './viewer/index.js';
export { EventEmitter } from './viewer/index.js';
export { LayerManager } from './viewer/index.js';
export { SpatialIndex, hitTest } from './viewer/index.js';
export { MeasureTool, findSnaps, renderMeasureOverlay } from './viewer/index.js';
export type {
  CadViewerOptions,
  FormatConverter,
  SelectEvent,
  MeasureEvent,
  CadViewerEventMap,
  Tool,
  SnapType,
  SnapResult,
  MeasureState,
} from './viewer/index.js';

// Utils
export { computeEntitiesBounds, computeEntityBBox } from './utils/bbox.js';
export type { BBox } from './utils/bbox.js';
