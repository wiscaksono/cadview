import type { Point2D, Point3D, DxfSplineEntity } from '../parser/types.js';

/**
 * Evaluate a B-spline curve at parameter t using De Boor's algorithm.
 */
export function deBoor(
  degree: number,
  controlPoints: Point3D[],
  knots: number[],
  t: number,
  weights?: number[],
): Point3D {
  // Find knot span index
  const n = controlPoints.length - 1;
  let k = degree;
  while (k < n && knots[k + 1] <= t) k++;

  // Copy affected control points
  const d: Point3D[] = [];
  const w: number[] = [];
  for (let j = 0; j <= degree; j++) {
    const idx = k - degree + j;
    d.push({ ...controlPoints[idx] });
    w.push(weights ? weights[idx] : 1.0);
  }

  // De Boor recursion
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const i = k - degree + j;
      const denom = knots[i + degree - r + 1] - knots[i];
      if (Math.abs(denom) < 1e-10) continue;
      const alpha = (t - knots[i]) / denom;

      if (weights) {
        // NURBS: weighted interpolation
        const w0 = w[j - 1] * (1 - alpha);
        const w1 = w[j] * alpha;
        const wSum = w0 + w1;
        if (Math.abs(wSum) < 1e-10) continue;
        d[j].x = (d[j - 1].x * w0 + d[j].x * w1) / wSum;
        d[j].y = (d[j - 1].y * w0 + d[j].y * w1) / wSum;
        d[j].z = (d[j - 1].z * w0 + d[j].z * w1) / wSum;
        w[j] = wSum;
      } else {
        d[j].x = (1 - alpha) * d[j - 1].x + alpha * d[j].x;
        d[j].y = (1 - alpha) * d[j - 1].y + alpha * d[j].y;
        d[j].z = (1 - alpha) * d[j - 1].z + alpha * d[j].z;
      }
    }
  }

  return d[degree];
}

/**
 * Convert fit points to a polyline using Catmull-Rom interpolation.
 */
export function fitPointsToPolyline(fitPoints: Point3D[]): Point2D[] {
  if (fitPoints.length < 2) return fitPoints.map(p => ({ x: p.x, y: p.y }));

  const result: Point2D[] = [];
  const n = fitPoints.length;
  const segments = 10; // subdivisions per segment

  for (let i = 0; i < n - 1; i++) {
    const p0 = fitPoints[Math.max(0, i - 1)];
    const p1 = fitPoints[i];
    const p2 = fitPoints[Math.min(n - 1, i + 1)];
    const p3 = fitPoints[Math.min(n - 1, i + 2)];

    for (let j = 0; j <= (i === n - 2 ? segments : segments - 1); j++) {
      const t = j / segments;
      const t2 = t * t;
      const t3 = t2 * t;

      // Catmull-Rom basis
      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );
      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );

      result.push({ x, y });
    }
  }

  return result;
}

/**
 * Evaluate a spline entity into an array of points for rendering.
 */
export function evaluateSpline(entity: DxfSplineEntity, pixelSize: number): Point2D[] {
  // Degree 1: just return control points as-is (polyline)
  if (entity.degree === 1) {
    return entity.controlPoints.map(p => ({ x: p.x, y: p.y }));
  }

  // If only fit points (no control points or knots): approximate with Catmull-Rom
  if (entity.controlPoints.length === 0 && entity.fitPoints.length >= 2) {
    return fitPointsToPolyline(entity.fitPoints);
  }

  // Validate: need at least degree+1 control points and proper knot vector
  if (entity.controlPoints.length < entity.degree + 1) return [];
  if (entity.knots.length < entity.controlPoints.length + entity.degree + 1) return [];

  const points: Point2D[] = [];
  const tMin = entity.knots[entity.degree];
  const tMax = entity.knots[entity.knots.length - entity.degree - 1];

  if (tMax <= tMin) return [];

  // Adaptive: more points for longer/more complex splines
  const numPoints = Math.max(
    entity.controlPoints.length * 10,
    Math.ceil((tMax - tMin) / pixelSize),
  );
  const cappedPoints = Math.min(numPoints, 5000); // upper bound

  const weights = entity.weights.length > 0 ? entity.weights : undefined;

  for (let i = 0; i <= cappedPoints; i++) {
    const t = tMin + (tMax - tMin) * (i / cappedPoints);
    const p = deBoor(entity.degree, entity.controlPoints, entity.knots, t, weights);
    points.push({ x: p.x, y: p.y });
  }

  return points;
}
