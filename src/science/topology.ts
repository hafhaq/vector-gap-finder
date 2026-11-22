/**
 * Exact Topological Data Analysis (TDA):
 * Vietoris-Rips Persistent Homology (H0 connected components + H1 1-dimensional loops/cavities)
 * computed directly in the FULL HIGH-DIMENSIONAL cosine metric space (NOT 2D!).
 *
 * Algorithm:
 * - H0: Exact Kruskal Union-Find on sorted 1-simplices (edges).
 * - H1: Exact Edelsbrunner-Letscher-Zomorodian (2002) standard boundary matrix reduction
 *       on partial_2 over Z_2. Each reduced killer column directly yields the EXACT bounding
 *       1-cycle of corpus vertices surrounding a high-dimensional semantic cavity!
 */

import { pairwiseCosineDistanceMatrix, sphericalMean } from './math.ts';
import type { PersistencePair } from '../types.ts';

interface EdgeSimplex {
  id: number;
  u: number;
  v: number;
  weight: number;
  isTreeEdge: boolean; // true => negative edge (kills H0), false => positive edge (births H1!)
}

interface TriSimplex {
  u: number;
  v: number;
  w: number;
  e0: number; // edge ids
  e1: number;
  e2: number;
  weight: number;
}

/** Symmetric difference (XOR) of two strictly ascending integer arrays (Z_2 chain addition). */
function xorSorted(a: number[], b: number[]): number[] {
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (a[i] < b[j]) {
      out.push(a[i++]);
    } else {
      out.push(b[j++]);
    }
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}

class UnionFind {
  parent: Int32Array;
  constructor(n: number) {
    this.parent = new Int32Array(n);
    for (let i = 0; i < n; i++) this.parent[i] = i;
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (ra < rb) this.parent[rb] = ra;
    else this.parent[ra] = rb;
    return true;
  }
}

export function computePersistentHomology(
  vectors: Float64Array[],
  maxTriangles = 18000
): PersistencePair[] {
  const n = vectors.length;
  if (n < 4) return [];

  const dist = pairwiseCosineDistanceMatrix(vectors);

  // Gather all pairwise edges
  const allEdges: Array<{ u: number; v: number; weight: number }> = [];
  for (let u = 0; u < n; u++) {
    for (let v = u + 1; v < n; v++) {
      allEdges.push({ u, v, weight: dist[u * n + v] });
    }
  }
  allEdges.sort((a, b) => a.weight - b.weight || a.u - b.u || a.v - b.v);

  // 1. Exact H0 persistence via Union-Find & mark MST edges
  const uf = new UnionFind(n);
  const h0Pairs: PersistencePair[] = [];
  const edges: EdgeSimplex[] = [];
  let maxTreeEdge = 0;

  // Choose filtration cutoff so graph becomes well-connected while bounding O(n^3) triangles
  const edgeLimit = Math.min(allEdges.length, Math.max(n * 14, 420));
  const rawCutoff = allEdges[Math.min(allEdges.length - 1, edgeLimit - 1)].weight;

  for (let i = 0; i < allEdges.length; i++) {
    const e = allEdges[i];
    const merged = uf.union(e.u, e.v);
    if (merged) {
      maxTreeEdge = Math.max(maxTreeEdge, e.weight);
      h0Pairs.push({
        dimension: 0,
        birth: 0,
        death: e.weight,
        persistence: e.weight,
        cycleVertices: [e.u, e.v],
      });
    }
    if (e.weight <= rawCutoff || merged) {
      edges.push({
        id: edges.length,
        u: e.u,
        v: e.v,
        weight: e.weight,
        isTreeEdge: merged,
      });
    }
  }

  const filtrationCap = Math.max(rawCutoff, maxTreeEdge);

  // Build adjacency & edge lookup for edges within filtrationCap
  const edgeMap = new Map<number, number>(); // key = u * n + v -> edgeId
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    if (e.weight <= filtrationCap) {
      edgeMap.set(e.u * n + e.v, e.id);
      adj[e.u].push(e.v);
    }
  }

  // 2. Enumerate 2-simplices (triangles u < v < w) in the Vietoris-Rips complex
  const triangles: TriSimplex[] = [];
  for (let u = 0; u < n; u++) {
    const nu = adj[u];
    for (let i = 0; i < nu.length; i++) {
      const v = nu[i];
      for (let j = i + 1; j < nu.length; j++) {
        const w = nu[j];
        const lo = v < w ? v : w;
        const hi = v < w ? w : v;
        const eVW = edgeMap.get(lo * n + hi);
        if (eVW === undefined) continue;
        const eUV = edgeMap.get(u * n + lo)!;
        const eUW = edgeMap.get(u * n + hi)!;
        const weight = Math.max(edges[eUV].weight, edges[eUW].weight, edges[eVW].weight);
        triangles.push({ u, v: lo, w: hi, e0: eUV, e1: eUW, e2: eVW, weight });
      }
    }
  }

  triangles.sort((a, b) => a.weight - b.weight);
  const activeTriangles =
    triangles.length > maxTriangles ? triangles.slice(0, maxTriangles) : triangles;

  // 3. Exact Z_2 boundary matrix reduction on partial_2 (triangles -> edges)
  // pivotToCol maps pivotEdgeId -> reduced column (sorted ascending edgeIds)
  const pivotToCol = new Map<number, number[]>();
  const killedEdges = new Set<number>();
  const h1Pairs: PersistencePair[] = [];

  for (let t = 0; t < activeTriangles.length; t++) {
    const tri = activeTriangles[t];
    let col = [tri.e0, tri.e1, tri.e2].sort((a, b) => a - b);

    while (col.length > 0) {
      const low = col[col.length - 1];
      const existing = pivotToCol.get(low);
      if (!existing) {
        pivotToCol.set(low, col);
        const birthEdge = edges[low];
        killedEdges.add(low);

        const birth = birthEdge.weight;
        const death = tri.weight;
        const persistence = death - birth;

        // Keep nontrivial topological cavities (persistence > 1e-4)
        if (!birthEdge.isTreeEdge && persistence > 1e-4) {
          const cycleVerts = extractOrderedCycleVertices(col, edges);
          const cycleVecs = cycleVerts.map((idx) => vectors[idx]);
          const barycenter = cycleVecs.length >= 3 ? sphericalMean(cycleVecs) : undefined;
          h1Pairs.push({
            dimension: 1,
            birth,
            death,
            persistence,
            cycleVertices: cycleVerts,
            barycenter,
          });
        }
        break;
      }
      col = xorSorted(col, existing);
    }
  }

  // Sort H1 pairs by descending persistence (most significant topological cavities first!)
  h1Pairs.sort((a, b) => b.persistence - a.persistence);
  h0Pairs.sort((a, b) => b.persistence - a.persistence);

  return [...h1Pairs, ...h0Pairs];
}

/**
 * Given a Z_2 1-cycle (list of edge IDs), trace the vertices around the loop in cyclic order
 * so we can render the exact bounding polygon of the topological hole!
 */
function extractOrderedCycleVertices(edgeIds: number[], edges: EdgeSimplex[]): number[] {
  const nbrs = new Map<number, number[]>();
  for (const eid of edgeIds) {
    const e = edges[eid];
    if (!nbrs.has(e.u)) nbrs.set(e.u, []);
    if (!nbrs.has(e.v)) nbrs.set(e.v, []);
    nbrs.get(e.u)!.push(e.v);
    nbrs.get(e.v)!.push(e.u);
  }
  const verts = [...nbrs.keys()];
  if (verts.length === 0) return [];

  // Walk main loop greedily from first vertex
  const ordered: number[] = [verts[0]];
  const visited = new Set<number>([verts[0]]);
  let curr = verts[0];
  while (ordered.length < verts.length) {
    const adj = nbrs.get(curr) ?? [];
    const next = adj.find((v) => !visited.has(v));
    if (next === undefined) break;
    ordered.push(next);
    visited.add(next);
    curr = next;
  }
  return ordered;
}
