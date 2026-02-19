import type { Point3D } from '../parser/types.js';

export function normalize3D(v: Point3D): Point3D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function cross3D(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Arbitrary Axis Algorithm (per DXF specification).
 * Given an extrusion vector (the OCS Z-axis), compute the OCS X and Y axes.
 */
export function arbitraryAxisAlgorithm(extrusion: Point3D): { ax: Point3D; ay: Point3D; az: Point3D } {
  const THRESHOLD = 1 / 64;
  const az = normalize3D(extrusion);

  let ax: Point3D;
  if (Math.abs(az.x) < THRESHOLD && Math.abs(az.y) < THRESHOLD) {
    // Near world Z-axis: cross with world Y
    ax = normalize3D(cross3D({ x: 0, y: 1, z: 0 }, az));
  } else {
    // Cross with world Z
    ax = normalize3D(cross3D({ x: 0, y: 0, z: 1 }, az));
  }

  const ay = normalize3D(cross3D(az, ax));
  return { ax, ay, az };
}

/**
 * Transform a point from OCS to WCS.
 */
export function ocsToWcs(point: Point3D, extrusion: Point3D): Point3D {
  // Optimization: skip if extrusion is default (0, 0, 1)
  if (extrusion.x === 0 && extrusion.y === 0 && extrusion.z === 1) {
    return point;
  }

  const { ax, ay, az } = arbitraryAxisAlgorithm(extrusion);
  return {
    x: point.x * ax.x + point.y * ay.x + point.z * az.x,
    y: point.x * ax.y + point.y * ay.y + point.z * az.y,
    z: point.x * ax.z + point.y * ay.z + point.z * az.z,
  };
}

/**
 * Convert a bulge value between two points to arc parameters.
 *
 * Bulge = tan(included_angle / 4)
 * Positive bulge = arc bulges to the LEFT of the direction P1 -> P2 (CCW)
 * Negative bulge = arc bulges to the RIGHT (CW)
 */
export function bulgeToArc(
  x1: number, y1: number,
  x2: number, y2: number,
  bulge: number,
): { cx: number; cy: number; radius: number; startAngle: number; endAngle: number; anticlockwise: boolean } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const chord = Math.sqrt(dx * dx + dy * dy);

  if (chord < 1e-10) {
    // Degenerate: points are the same
    return { cx: x1, cy: y1, radius: 0, startAngle: 0, endAngle: 0, anticlockwise: false };
  }

  const sagitta = Math.abs(bulge) * chord / 2;
  const radius = ((chord / 2) ** 2 + sagitta ** 2) / (2 * sagitta);

  // Midpoint of chord
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // Perpendicular direction (left of P1->P2)
  const perpX = -dy / chord;
  const perpY = dx / chord;

  // Distance from midpoint to center
  const d = radius - sagitta;

  // Center: offset from midpoint perpendicular to chord
  // Positive bulge: center is to the left
  // Negative bulge: center is to the right
  const sign = bulge > 0 ? 1 : -1;
  const cx = mx + sign * d * perpX;
  const cy = my + sign * d * perpY;

  // Angles from center to start/end points
  const startAngle = Math.atan2(y1 - cy, x1 - cx);
  const endAngle = Math.atan2(y2 - cy, x2 - cx);

  // Bulge > 0 means CCW, < 0 means CW
  const anticlockwise = bulge < 0;

  return { cx, cy, radius, startAngle, endAngle, anticlockwise };
}

/**
 * Draw a bulge arc segment on the canvas context.
 */
export function drawBulgeArc(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  bulge: number,
): void {
  const arc = bulgeToArc(x1, y1, x2, y2, bulge);
  if (arc.radius < 1e-10) {
    ctx.lineTo(x2, y2);
    return;
  }
  ctx.arc(arc.cx, arc.cy, arc.radius, arc.startAngle, arc.endAngle, arc.anticlockwise);
}
