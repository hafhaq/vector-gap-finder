/**
 * Spherical k-Means++ Clustering, k-NN Semantic Similarity Graph,
 * and Ronald Burt's Structural Hole Constraint Metric (1992).
 */

import { cosineSim, mulberry32, normalizeInPlace } from './math.ts';
import type { ClusterInfo } from '../types.ts';

export const CLUSTER_PALETTE = [
  '#38bdf8', // sky cyan
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fb923c', // warm orange
  '#f472b6', // rose pink
  '#facc15', // gold
  '#2dd4bf', // teal
  '#818cf8', // indigo
  '#fb7185', // coral
];

/**
 * Spherical k-Means++ on S^(d-1) maximizing sum_i cos(v_i, mu_{c(i)}).
 * Runs multiple deterministic restarts and keeps the highest-cohesion partition.
 */
export function sphericalKMeans(
  vectors: Float64Array[],
  kRequested: number,
  extractKeywords: (indices: number[], topK?: number) => string[]
): { clusters: ClusterInfo[]; assignments: Int32Array } {
  const n = vectors.length;
  const dim = vectors[0]?.length ?? 0;
  const k = Math.max(2, Math.min(kRequested, Math.floor(n / 2), CLUSTER_PALETTE.length));

  let bestAssign = new Int32Array(n);
  let bestCentroids: Float64Array[] = [];
  let bestScore = -Infinity;

  const restarts = 6;
  for (let run = 0; run < restarts; run++) {
    const rand = mulberry32(1337 + run * 997);
    const centroids: Float64Array[] = [];

    // k-Means++ initialization on cosine distance
    const first = Math.floor(rand() * n);
    centroids.push(new Float64Array(vectors[first]));

    for (let c = 1; c < k; c++) {
      const d2 = new Float64Array(n);
      let sum = 0;
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        for (const cent of centroids) {
          const d = 1 - cosineSim(vectors[i], cent);
          if (d < minDist) minDist = d;
        }
        d2[i] = minDist * minDist;
        sum += d2[i];
      }
      let r = rand() * sum;
      let picked = 0;
      for (let i = 0; i < n; i++) {
        r -= d2[i];
        if (r <= 0) {
          picked = i;
          break;
        }
      }
      centroids.push(new Float64Array(vectors[picked]));
    }

    const assign = new Int32Array(n).fill(-1);
    for (let iter = 0; iter < 30; iter++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        let bestC = 0;
        let bestS = -Infinity;
        for (let c = 0; c < k; c++) {
          const s = cosineSim(vectors[i], centroids[c]);
          if (s > bestS) {
            bestS = s;
            bestC = c;
          }
        }
        if (assign[i] !== bestC) {
          assign[i] = bestC;
          changed = true;
        }
      }
      if (!changed) break;

      // Recompute spherical centroids
      for (let c = 0; c < k; c++) {
        const acc = new Float64Array(dim);
        let count = 0;
        for (let i = 0; i < n; i++) {
          if (assign[i] === c) {
            const v = vectors[i];
            for (let d = 0; d < dim; d++) acc[d] += v[d];
            count++;
          }
        }
        if (count > 0) {
          centroids[c] = normalizeInPlace(acc);
        } else {
          // Re-seed empty cluster with farthest point
          let worstI = 0;
          let worstSim = Infinity;
          for (let i = 0; i < n; i++) {
            const s = cosineSim(vectors[i], centroids[assign[i]]);
            if (s < worstSim) {
              worstSim = s;
              worstI = i;
            }
          }
          centroids[c] = new Float64Array(vectors[worstI]);
          assign[worstI] = c;
        }
      }
    }

    let totalSim = 0;
    for (let i = 0; i < n; i++) {
      totalSim += cosineSim(vectors[i], centroids[assign[i]]);
    }
    if (totalSim > bestScore) {
      bestScore = totalSim;
      bestAssign = new Int32Array(assign);
      bestCentroids = centroids.map((c) => new Float64Array(c));
    }
  }

  // Build ClusterInfo objects
  const clusters: ClusterInfo[] = [];
  for (let c = 0; c < k; c++) {
    const members: number[] = [];
    let cohSum = 0;
    for (let i = 0; i < n; i++) {
      if (bestAssign[i] === c) {
        members.push(i);
        cohSum += cosineSim(vectors[i], bestCentroids[c]);
      }
    }
    const keywords = extractKeywords(members, 3);
    const label =
      keywords.length > 0
        ? keywords
            .slice(0, 2)
            .map((kw) => kw.replace(/\b\w/g, (ch) => ch.toUpperCase()))
            .join(' · ')
        : `Cluster ${c + 1}`;
    clusters.push({
      id: c,
      label,
      color: CLUSTER_PALETTE[c % CLUSTER_PALETTE.length],
      centroid: bestCentroids[c],
      memberIndices: members,
      keywords,
      cohesion: members.length > 0 ? cohSum / members.length : 0,
      burtConstraint: 0,
    });
  }

  // Compute inter-cluster Burt structural-hole constraint on cluster affinity graph
  const kCount = clusters.length;
  const pMat = new Float64Array(kCount * kCount);
  for (let i = 0; i < kCount; i++) {
    let rowSum = 0;
    for (let j = 0; j < kCount; j++) {
      if (i === j) continue;
      const w = Math.max(0.001, cosineSim(clusters[i].centroid, clusters[j].centroid) + 0.25);
      pMat[i * kCount + j] = w;
      rowSum += w;
    }
    for (let j = 0; j < kCount; j++) {
      pMat[i * kCount + j] /= rowSum;
    }
  }
  for (let i = 0; i < kCount; i++) {
    let constraint = 0;
    for (let j = 0; j < kCount; j++) {
      if (i === j) continue;
      let indirect = 0;
      for (let q = 0; q < kCount; q++) {
        if (q === i || q === j) continue;
        indirect += pMat[i * kCount + q] * pMat[q * kCount + j];
      }
      const dyad = pMat[i * kCount + j] + indirect;
      constraint += dyad * dyad;
    }
    clusters[i].burtConstraint = constraint;
  }

  return { clusters, assignments: bestAssign };
}

/** Build symmetric k-NN cosine similarity graph for visualization & topological inspection */
export function buildKnnGraph(
  vectors: Float64Array[],
  k = 4
): Array<[number, number, number]> {
  const n = vectors.length;
  const seen = new Set<string>();
  const edges: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    const sims = Array.from({ length: n }, (_, j) => ({
      j,
      sim: i === j ? -Infinity : cosineSim(vectors[i], vectors[j]),
    }));
    sims.sort((a, b) => b.sim - a.sim);
    for (let m = 0; m < Math.min(k, n - 1); m++) {
      const j = sims[m].j;
      const lo = Math.min(i, j);
      const hi = Math.max(i, j);
      const key = `${lo}:${hi}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([lo, hi, sims[m].sim]);
      }
    }
  }
  return edges;
}
