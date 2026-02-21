---
title: Types
---

# TypeScript Types

<p class="subtitle">// complete type reference for @cadview/core</p>

All types are exported from `@cadview/core` and re-exported by framework wrappers.

```typescript
import type { DxfDocument, DxfEntity, DxfLayer, Tool, Theme } from '@cadview/core';
```

## Core Types

### Point2D

```typescript
interface Point2D {
  x: number;
  y: number;
}
```

### Point3D

```typescript
interface Point3D {
  x: number;
  y: number;
  z: number;
}
```

### Tool

```typescript
type Tool = 'pan' | 'select' | 'measure';
```

### Theme

```typescript
type Theme = 'dark' | 'light';
```

### ThemeConfig

```typescript
interface ThemeConfig {
  backgroundColor: string;
  defaultEntityColor: string;
  selectionColor: string;
  measureColor: string;
  gridColor: string;
  crosshairColor: string;
}
```

### ViewTransform

```typescript
interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}
```

### BBox

```typescript
interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
```

## Document Types

### DxfDocument

The root data structure returned by `parseDxf()`.

```typescript
interface DxfDocument {
  header: DxfHeader;
  layers: Map<string, DxfLayer>;
  lineTypes: Map<string, DxfLineType>;
  styles: Map<string, DxfStyle>;
  blocks: Map<string, DxfBlock>;
  entities: DxfEntity[];
}
```

### DxfHeader

```typescript
interface DxfHeader {
  acadVersion: string;          // e.g., "AC1027"
  extMin?: Point3D;             // Drawing extents minimum
  extMax?: Point3D;             // Drawing extents maximum
  insUnits: number;             // Insert units (0=unitless, 1=inches, 4=mm, ...)
  measurement: number;          // 0=English, 1=Metric
  ltScale: number;              // Global linetype scale
  dwgCodePage?: string;         // Encoding codepage for pre-R2007 files
  handleSeed?: string;          // Next available handle
  [key: string]: unknown;       // Additional header variables
}
```

### DxfLayer

```typescript
interface DxfLayer {
  name: string;
  color: number;        // ACI color index (1-255)
  lineType: string;
  flags: number;
  lineWeight: number;
  trueColor?: number;   // 24-bit RGB packed integer
  isOff: boolean;        // Layer is off (not rendered)
  isFrozen: boolean;     // Layer is frozen
  isLocked: boolean;     // Layer is locked
}
```

### DxfLineType

```typescript
interface DxfLineType {
  name: string;
  description: string;
  pattern: number[];      // Dash-gap pattern
  totalLength: number;
}
```

### DxfStyle

```typescript
interface DxfStyle {
  name: string;
  fontName: string;
  bigFontName: string;
  height: number;
  widthFactor: number;
  obliqueAngle: number;
}
```

### DxfBlock

```typescript
interface DxfBlock {
  name: string;
  basePoint: Point3D;
  entities: DxfEntity[];
  flags: number;
}
```

## Entity Types

All entities extend `DxfEntityBase`:

```typescript
interface DxfEntityBase {
  type: string;
  handle?: string;
  layer: string;
  color: number;            // ACI color (0=BYBLOCK, 256=BYLAYER, 1-255=direct)
  trueColor?: number;       // 24-bit RGB packed integer
  lineType: string;
  lineTypeScale: number;
  lineWeight: number;
  visible: boolean;
  extrusion: Point3D;       // OCS normal vector
}
```

### DxfEntity (Discriminated Union)

```typescript
type DxfEntity =
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
```

You can use the `type` discriminant for type narrowing:

```typescript
if (entity.type === 'CIRCLE') {
  console.log(entity.radius);  // TypeScript knows this is DxfCircleEntity
}
```

### Geometry Entities

```typescript
interface DxfLineEntity extends DxfEntityBase {
  type: 'LINE';
  start: Point3D;
  end: Point3D;
}

interface DxfCircleEntity extends DxfEntityBase {
  type: 'CIRCLE';
  center: Point3D;
  radius: number;
}

interface DxfArcEntity extends DxfEntityBase {
  type: 'ARC';
  center: Point3D;
  radius: number;
  startAngle: number;   // Degrees
  endAngle: number;     // Degrees
}

interface DxfEllipseEntity extends DxfEntityBase {
  type: 'ELLIPSE';
  center: Point3D;
  majorAxis: Point3D;     // Endpoint of major axis relative to center
  minorRatio: number;     // Ratio of minor to major axis (0-1)
  startParam: number;     // Start parameter (radians)
  endParam: number;       // End parameter (radians)
}

interface DxfPointEntity extends DxfEntityBase {
  type: 'POINT';
  position: Point3D;
}
```

### Polylines

```typescript
interface DxfLwPolylineVertex {
  x: number;
  y: number;
  bulge: number;          // Arc bulge factor (0 = straight segment)
  startWidth: number;
  endWidth: number;
}

interface DxfLwPolylineEntity extends DxfEntityBase {
  type: 'LWPOLYLINE';
  vertices: DxfLwPolylineVertex[];
  closed: boolean;
  constantWidth: number;
  elevation: number;
}

interface DxfPolylineEntity extends DxfEntityBase {
  type: 'POLYLINE';
  vertices: DxfLwPolylineVertex[];
  closed: boolean;
  is3d: boolean;
}
```

### Spline

```typescript
interface DxfSplineEntity extends DxfEntityBase {
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
```

### Text Entities

```typescript
interface DxfTextEntity extends DxfEntityBase {
  type: 'TEXT';
  text: string;
  insertionPoint: Point3D;
  alignmentPoint?: Point3D;
  height: number;
  rotation: number;        // Degrees
  widthFactor: number;
  obliqueAngle: number;
  style: string;
  hAlign: number;          // Horizontal alignment (0-5)
  vAlign: number;          // Vertical alignment (0-3)
  generationFlags: number;
}

interface DxfMTextEntity extends DxfEntityBase {
  type: 'MTEXT';
  text: string;            // May contain MTEXT format codes
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
```

### INSERT (Block References)

```typescript
interface DxfInsertEntity extends DxfEntityBase {
  type: 'INSERT';
  blockName: string;
  insertionPoint: Point3D;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotation: number;          // Degrees
  columnCount: number;       // MINSERT grid columns
  rowCount: number;          // MINSERT grid rows
  columnSpacing: number;
  rowSpacing: number;
  attribs: DxfAttrib[];
}

interface DxfAttrib {
  tag: string;
  text: string;
  insertionPoint: Point3D;
  height: number;
  rotation: number;
  style: string;
  layer: string;
  color: number;
}
```

### DIMENSION

```typescript
interface DxfDimensionEntity extends DxfEntityBase {
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
```

### HATCH

```typescript
interface DxfHatchEntity extends DxfEntityBase {
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

interface DxfHatchBoundaryPath {
  type: 'polyline' | 'edges';
  vertices?: Point2D[];
  bulges?: number[];
  isClosed?: boolean;
  edges?: DxfHatchEdge[];
  flags: number;
}

type DxfHatchEdge =
  | { type: 'line'; start: Point2D; end: Point2D }
  | { type: 'arc'; center: Point2D; radius: number; startAngle: number; endAngle: number; ccw: boolean }
  | { type: 'ellipse'; center: Point2D; majorAxis: Point2D; minorRatio: number; startAngle: number; endAngle: number; ccw: boolean }
  | { type: 'spline'; degree: number; knots: number[]; controlPoints: Point2D[]; weights?: number[] };
```

## FormatConverter

Interface for adding support for non-DXF file formats:

```typescript
interface FormatConverter {
  /** Return true if the buffer is in this format. Check magic bytes, not extensions. */
  detect(buffer: ArrayBuffer): boolean;

  /** Convert the buffer to a DXF string parseable by parseDxf(). */
  convert(buffer: ArrayBuffer): Promise<string>;
}
```

See [DWG Support](/docs/dwg-support) for the built-in `dwgConverter` implementation.
