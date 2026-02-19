export { CadViewer } from './viewer.js';
export type { CadViewerOptions, Tool } from './viewer.js';
export type { SelectEvent, MeasureEvent, CadViewerEventMap } from './events.js';
export { EventEmitter } from './events.js';
export { LayerManager } from './layers.js';
export { SpatialIndex, hitTest, distanceToEntity, distPointToSegment } from './selection.js';
export { MeasureTool, findSnaps, renderMeasureOverlay } from './measure.js';
export type { SnapType, SnapResult, MeasureState } from './measure.js';
