export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface DxfDocument {
  header: DxfHeader;
  layers: Map<string, DxfLayer>;
  lineTypes: Map<string, DxfLineType>;
  styles: Map<string, DxfStyle>;
  blocks: Map<string, DxfBlock>;
  entities: DxfEntity[];
}

export interface DxfHeader {
  acadVersion: string;
  extMin?: Point3D;
  extMax?: Point3D;
  insUnits: number;
  measurement: number;
  ltScale: number;
  dwgCodePage?: string;
  handleSeed?: string;
  [key: string]: unknown;
}

export interface DxfLayer {
  name: string;
  color: number;
  lineType: string;
  flags: number;
  lineWeight: number;
  trueColor?: number;
  isOff: boolean;
  isFrozen: boolean;
  isLocked: boolean;
}

export interface DxfLineType {
  name: string;
  description: string;
  pattern: number[];
  totalLength: number;
}

export interface DxfStyle {
  name: string;
  fontName: string;
  bigFontName: string;
  height: number;
  widthFactor: number;
  obliqueAngle: number;
}

export interface DxfBlock {
  name: string;
  basePoint: Point3D;
  entities: DxfEntity[];
  flags: number;
}

// Entity base
export interface DxfEntityBase {
  type: string;
  handle?: string;
  layer: string;
  color: number;
  trueColor?: number;
  lineType: string;
  lineTypeScale: number;
  lineWeight: number;
  visible: boolean;
  extrusion: Point3D;
}

// All 13 entity types
export interface DxfLineEntity extends DxfEntityBase {
  type: 'LINE';
  start: Point3D;
  end: Point3D;
}

export interface DxfCircleEntity extends DxfEntityBase {
  type: 'CIRCLE';
  center: Point3D;
  radius: number;
}

export interface DxfArcEntity extends DxfEntityBase {
  type: 'ARC';
  center: Point3D;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface DxfLwPolylineVertex {
  x: number;
  y: number;
  bulge: number;
  startWidth: number;
  endWidth: number;
}

export interface DxfLwPolylineEntity extends DxfEntityBase {
  type: 'LWPOLYLINE';
  vertices: DxfLwPolylineVertex[];
  closed: boolean;
  constantWidth: number;
  elevation: number;
}

export interface DxfPolylineEntity extends DxfEntityBase {
  type: 'POLYLINE';
  vertices: DxfLwPolylineVertex[];
  closed: boolean;
  is3d: boolean;
}

export interface DxfEllipseEntity extends DxfEntityBase {
  type: 'ELLIPSE';
  center: Point3D;
  majorAxis: Point3D;
  minorRatio: number;
  startParam: number;
  endParam: number;
}

export interface DxfSplineEntity extends DxfEntityBase {
  type: 'SPLINE';
  degree: number;
  flags: number;
  knots: number[];
  controlPoints: Point3D[];
  fitPoints: Point3D[];
  weights: number[];
  startTangent?: Point3D;
  endTangent?: Point3D;
}

export interface DxfTextEntity extends DxfEntityBase {
  type: 'TEXT';
  text: string;
  insertionPoint: Point3D;
  alignmentPoint?: Point3D;
  height: number;
  rotation: number;
  widthFactor: number;
  obliqueAngle: number;
  style: string;
  hAlign: number;
  vAlign: number;
  generationFlags: number;
}

export interface DxfMTextEntity extends DxfEntityBase {
  type: 'MTEXT';
  text: string;
  insertionPoint: Point3D;
  height: number;
  width: number;
  attachmentPoint: number;
  drawingDirection: number;
  rotation: number;
  lineSpacingStyle: number;
  lineSpacingFactor: number;
  style: string;
  textDirection?: Point3D;
  bgFill: number;
  bgFillColor?: number;
  bgFillTrueColor?: number;
  bgFillScale: number;
}

export interface DxfInsertEntity extends DxfEntityBase {
  type: 'INSERT';
  blockName: string;
  insertionPoint: Point3D;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotation: number;
  columnCount: number;
  rowCount: number;
  columnSpacing: number;
  rowSpacing: number;
  attribs: DxfAttrib[];
}

export interface DxfAttrib {
  tag: string;
  text: string;
  insertionPoint: Point3D;
  height: number;
  rotation: number;
  style: string;
  layer: string;
  color: number;
}

export interface DxfDimensionEntity extends DxfEntityBase {
  type: 'DIMENSION';
  blockName: string;
  dimStyle: string;
  dimType: number;
  defPoint: Point3D;
  textMidpoint: Point3D;
  defPoint2?: Point3D;
  defPoint3?: Point3D;
  defPoint4?: Point3D;
  defPoint5?: Point3D;
  textOverride: string;
  rotation: number;
  textRotation: number;
  leaderLength: number;
}

export interface DxfHatchBoundaryPath {
  type: 'polyline' | 'edges';
  vertices?: Point2D[];
  bulges?: number[];
  isClosed?: boolean;
  edges?: DxfHatchEdge[];
  flags: number;
}

export type DxfHatchEdge =
  | { type: 'line'; start: Point2D; end: Point2D }
  | { type: 'arc'; center: Point2D; radius: number; startAngle: number; endAngle: number; ccw: boolean }
  | { type: 'ellipse'; center: Point2D; majorAxis: Point2D; minorRatio: number; startAngle: number; endAngle: number; ccw: boolean }
  | { type: 'spline'; degree: number; knots: number[]; controlPoints: Point2D[]; weights?: number[] };

export interface DxfHatchEntity extends DxfEntityBase {
  type: 'HATCH';
  patternName: string;
  solidFill: boolean;
  associative: boolean;
  hatchStyle: number;
  patternType: number;
  patternAngle: number;
  patternScale: number;
  boundaryPaths: DxfHatchBoundaryPath[];
}

export interface DxfPointEntity extends DxfEntityBase {
  type: 'POINT';
  position: Point3D;
}

export type DxfEntity =
  | DxfLineEntity
  | DxfCircleEntity
  | DxfArcEntity
  | DxfLwPolylineEntity
  | DxfPolylineEntity
  | DxfEllipseEntity
  | DxfSplineEntity
  | DxfTextEntity
  | DxfMTextEntity
  | DxfInsertEntity
  | DxfDimensionEntity
  | DxfHatchEntity
  | DxfPointEntity;
