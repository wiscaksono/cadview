---
title: Entities
description: 13 supported DXF entity types including geometry, text, block references, dimensions, and fill patterns.
---

# Supported Entities

<p class="subtitle">// 13 DXF entity types parsed and rendered</p>

@cadview supports the most common DXF entity types covering geometry, text, block references, dimensions, and fill patterns.

## Geometry

### LINE

A straight line segment between two points.

| Property | Type      | Description |
| -------- | --------- | ----------- |
| `start`  | `Point3D` | Start point |
| `end`    | `Point3D` | End point   |

### CIRCLE

A full circle defined by center and radius.

| Property | Type      | Description  |
| -------- | --------- | ------------ |
| `center` | `Point3D` | Center point |
| `radius` | `number`  | Radius       |

### ARC

A circular arc segment.

| Property     | Type      | Description            |
| ------------ | --------- | ---------------------- |
| `center`     | `Point3D` | Center point           |
| `radius`     | `number`  | Radius                 |
| `startAngle` | `number`  | Start angle in degrees |
| `endAngle`   | `number`  | End angle in degrees   |

### ELLIPSE

A full or partial ellipse.

| Property     | Type      | Description                                 |
| ------------ | --------- | ------------------------------------------- |
| `center`     | `Point3D` | Center point                                |
| `majorAxis`  | `Point3D` | Endpoint of major axis (relative to center) |
| `minorRatio` | `number`  | Ratio of minor to major axis (0&ndash;1)    |
| `startParam` | `number`  | Start parameter in radians                  |
| `endParam`   | `number`  | End parameter in radians                    |

### LWPOLYLINE

A lightweight polyline with optional arc segments (bulge factor).

| Property        | Type                    | Description                          |
| --------------- | ----------------------- | ------------------------------------ |
| `vertices`      | `DxfLwPolylineVertex[]` | Vertex list with x, y, bulge, widths |
| `closed`        | `boolean`               | Whether the polyline is closed       |
| `constantWidth` | `number`                | Constant width for all segments      |
| `elevation`     | `number`                | Z elevation                          |

### POLYLINE

A 2D or 3D polyline (legacy format).

| Property   | Type                    | Description                    |
| ---------- | ----------------------- | ------------------------------ |
| `vertices` | `DxfLwPolylineVertex[]` | Vertex list                    |
| `closed`   | `boolean`               | Whether the polyline is closed |
| `is3d`     | `boolean`               | Whether this is a 3D polyline  |

### SPLINE

A B-spline (NURBS) curve.

| Property        | Type        | Description           |
| --------------- | ----------- | --------------------- |
| `degree`        | `number`    | Spline degree         |
| `knots`         | `number[]`  | Knot vector           |
| `controlPoints` | `Point3D[]` | Control points        |
| `fitPoints`     | `Point3D[]` | Fit points            |
| `weights`       | `number[]`  | Control point weights |

### POINT

A single point in space.

| Property   | Type      | Description       |
| ---------- | --------- | ----------------- |
| `position` | `Point3D` | Point coordinates |

## Text

### TEXT

Single-line text.

| Property         | Type      | Description                      |
| ---------------- | --------- | -------------------------------- |
| `text`           | `string`  | Text content                     |
| `insertionPoint` | `Point3D` | Insertion point                  |
| `height`         | `number`  | Text height                      |
| `rotation`       | `number`  | Rotation in degrees              |
| `style`          | `string`  | Text style name                  |
| `hAlign`         | `number`  | Horizontal alignment (0&ndash;5) |
| `vAlign`         | `number`  | Vertical alignment (0&ndash;3)   |

### MTEXT

Multi-line formatted text. May contain MTEXT format codes (e.g., `\P` for paragraph break, `\fArial;` for font changes). Format codes are stripped during rendering.

| Property          | Type      | Description                  |
| ----------------- | --------- | ---------------------------- |
| `text`            | `string`  | Text with format codes       |
| `insertionPoint`  | `Point3D` | Insertion point              |
| `height`          | `number`  | Text height                  |
| `width`           | `number`  | Text box width               |
| `attachmentPoint` | `number`  | Attachment point (1&ndash;9) |
| `rotation`        | `number`  | Rotation in degrees          |
| `style`           | `string`  | Text style name              |

## References

### INSERT

A block reference (instance of a block definition). Supports scale, rotation, and MINSERT grids.

| Property         | Type          | Description            |
| ---------------- | ------------- | ---------------------- |
| `blockName`      | `string`      | Referenced block name  |
| `insertionPoint` | `Point3D`     | Insertion point        |
| `scaleX`         | `number`      | X scale factor         |
| `scaleY`         | `number`      | Y scale factor         |
| `scaleZ`         | `number`      | Z scale factor         |
| `rotation`       | `number`      | Rotation in degrees    |
| `columnCount`    | `number`      | Grid columns (MINSERT) |
| `rowCount`       | `number`      | Grid rows (MINSERT)    |
| `columnSpacing`  | `number`      | Column spacing         |
| `rowSpacing`     | `number`      | Row spacing            |
| `attribs`        | `DxfAttrib[]` | Block attributes       |

### DIMENSION

A dimension annotation. Rendered via its associated anonymous block.

| Property       | Type      | Description                                   |
| -------------- | --------- | --------------------------------------------- |
| `blockName`    | `string`  | Anonymous block containing dimension geometry |
| `dimStyle`     | `string`  | Dimension style name                          |
| `dimType`      | `number`  | Dimension type flags                          |
| `defPoint`     | `Point3D` | Definition point                              |
| `textMidpoint` | `Point3D` | Text midpoint                                 |
| `textOverride` | `string`  | Override text (empty = auto-calculated)       |

## Fill

### HATCH

A filled region with boundary paths. Supports solid fills and hatch patterns.

| Property        | Type                     | Description                          |
| --------------- | ------------------------ | ------------------------------------ |
| `patternName`   | `string`                 | Hatch pattern name (e.g., `"SOLID"`) |
| `solidFill`     | `boolean`                | Whether this is a solid fill         |
| `boundaryPaths` | `DxfHatchBoundaryPath[]` | Boundary path definitions            |
| `patternAngle`  | `number`                 | Pattern rotation angle               |
| `patternScale`  | `number`                 | Pattern scale                        |

Boundary paths can be either polyline-based or edge-based (composed of LINE, ARC, ELLIPSE, and SPLINE edges).

## Common Properties

All entities share these base properties:

| Property        | Type      | Description                                            |
| --------------- | --------- | ------------------------------------------------------ |
| `type`          | `string`  | Entity type discriminant                               |
| `handle`        | `string?` | Unique entity handle                                   |
| `layer`         | `string`  | Layer name                                             |
| `color`         | `number`  | ACI color (0=BYBLOCK, 256=BYLAYER, 1&ndash;255=direct) |
| `trueColor`     | `number?` | 24-bit RGB color                                       |
| `lineType`      | `string`  | Line type name                                         |
| `lineTypeScale` | `number`  | Line type scale factor                                 |
| `lineWeight`    | `number`  | Line weight                                            |
| `visible`       | `boolean` | Visibility flag                                        |
| `extrusion`     | `Point3D` | OCS normal vector                                      |
