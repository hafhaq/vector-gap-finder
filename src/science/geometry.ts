/**
 * Computational Geometry in 2D Projected Space:
 * - Exact Bowyer-Watson Delaunay Triangulation
 * - Voronoi circumcenters (maximal empty disks in 2D)
 * - Alpha-Shape interior filtering (separates true interior cavities from exterior space!)
 */

import type { DelaunayTriangle } from '../types.ts';

interface RawTri {
  a: number;
  b: number;
  c: number;
  cx: number;
  cy: number;
  r2: number;
}

function circumcircle(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number
): { ux: number; uy: number; r2: number } | null {
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = ax * ax + ay * ay;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
  const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  const dx = ux - ax;
  const dy = uy - ay;
  return { ux, uy, r2: dx * dx + dy * dy };
}

/**
 * Computes exact Bowyer-Watson Delaunay Triangulation + Alpha-Shape tagging.
 */
export function computeDelaunayAndAlphaShape(
  points: Array<[number, number]>,
  alphaQuantile = 0.86
): DelaunayTriangle[] {
  const n = points.length;
  if (n < 3) return [];

  // Super-triangle enclosing [-1, 1]^2 generously
  const pts: Array<[number, number]> = [
    ...points,
    [-12, -12],
    [24, -12],
    [0, 24],
  ];
  const s0 = n;
  const s1 = n + 1;
  const s2 = n + 2;

  const makeTri = (a: number, b: number, c: number): RawTri | null => {
    const cc = circumcircle(pts[a][0], pts[a][1], pts[b][0], pts[b][1], pts[c][0], pts[c][1]);
    if (!cc) return null;
    return { a, b, c, cx: cc.ux, cy: cc.uy, r2: cc.r2 };
  };

  const superTri = makeTri(s0, s1, s2);
  if (!superTri) return [];
  let triangles: RawTri[] = [superTri];

  for (let i = 0; i < n; i++) {
    const [px, py] = pts[i];
    const bad: RawTri[] = [];
    const good: RawTri[] = [];

    for (const tri of triangles) {
      const dx = px - tri.cx;
      const dy = py - tri.cy;
      if (dx * dx + dy * dy < tri.r2 - 1e-12) {
        bad.push(tri);
      } else {
        good.push(tri);
      }
    }

    // Boundary polygon of the cavity = edges appearing exactly once among bad triangles
    const edgeCount = new Map<string, [number, number, number]>();
    const addEdge = (u: number, v: number) => {
      const lo = Math.min(u, v);
      const hi = Math.max(u, v);
      const key = `${lo}:${hi}`;
      const existing = edgeCount.get(key);
      if (existing) existing[2]++;
      else edgeCount.set(key, [u, v, 1]);
    };

    for (const tri of bad) {
      addEdge(tri.a, tri.b);
      addEdge(tri.b, tri.c);
      addEdge(tri.c, tri.a);
    }

    triangles = good;
    for (const [u, v, count] of edgeCount.values()) {
      if (count === 1) {
        const nt = makeTri(u, v, i);
        if (nt) triangles.push(nt);
      }
    }
  }

  // Remove any triangle touching the super-triangle vertices
  const valid = triangles.filter(
    (t) => t.a < n && t.b < n && t.c < n
  );

  if (valid.length === 0) return [];

  // Alpha-shape threshold based on circumradius distribution + bounding box check
  const radii = valid.map((t) => Math.sqrt(t.r2)).sort((a, b) => a - b);
  const qIdx = Math.min(radii.length - 1, Math.floor(radii.length * alphaQuantile));
  const alphaMax = Math.max(radii[qIdx], 0.35);

  return valid.map((t) => {
    const r = Math.sqrt(t.r2);
    // Reject sliver triangles whose circumcenter shoots outside the convex domain
    const inBounds = Math.abs(t.cx) <= 0.96 && Math.abs(t.cy) <= 0.96;
    // Also reject triangles whose circumcenter is far from triangle centroid (obtuse sliver on hull)
    const mx = (points[t.a][0] + points[t.b][0] + points[t.c][0]) / 3;
    const my = (points[t.a][1] + points[t.b][1] + points[t.c][1]) / 3;
    const shift = Math.hypot(t.cx - mx, t.cy - my);
    const inAlphaShape = inBounds && r <= alphaMax && shift <= r * 0.95;

    return {
      a: t.a,
      b: t.b,
      c: t.c,
      cx: t.cx,
      cy: t.cy,
      radius: r,
      inAlphaShape,
    };
  });
}
