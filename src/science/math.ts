/**
 * Core linear algebra, spherical geometry on S^(d-1), and eigen-decomposition utilities.
 * Uses Float64Array for numerical stability across SVD, vMF KDE, and Riemannian optimization.
 */

export function dot(a: Float64Array, b: Float64Array): number {
  let s = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export function norm(a: Float64Array): number {
  return Math.sqrt(dot(a, a));
}

export function normalize(a: Float64Array): Float64Array {
  const out = new Float64Array(a.length);
  const n = norm(a);
  if (n > 1e-12) {
    const inv = 1 / n;
    for (let i = 0; i < a.length; i++) out[i] = a[i] * inv;
  }
  return out;
}

export function normalizeInPlace(a: Float64Array): Float64Array {
  const n = norm(a);
  if (n > 1e-12) {
    const inv = 1 / n;
    for (let i = 0; i < a.length; i++) a[i] *= inv;
  }
  return a;
}

/** Cosine similarity for already unit-normalized vectors (clamped to [-1, 1]). */
export function cosineSim(a: Float64Array, b: Float64Array): number {
  const d = dot(a, b);
  return d > 1 ? 1 : d < -1 ? -1 : d;
}

/** Cosine distance in [0, 2]. */
export function cosineDist(a: Float64Array, b: Float64Array): number {
  return 1 - cosineSim(a, b);
}

/** Geodesic (angular) distance on unit hypersphere S^(d-1) in [0, pi]. */
export function geodesicDist(a: Float64Array, b: Float64Array): number {
  return Math.acos(cosineSim(a, b));
}

/** Spherical linear interpolation (SLERP) along the great circle on S^(d-1). */
export function slerp(a: Float64Array, b: Float64Array, t: number): Float64Array {
  const d = cosineSim(a, b);
  const dim = a.length;
  const out = new Float64Array(dim);
  if (d > 0.9995) {
    for (let i = 0; i < dim; i++) out[i] = a[i] * (1 - t) + b[i] * t;
    return normalizeInPlace(out);
  }
  const theta = Math.acos(Math.max(-0.999999, Math.min(0.999999, d)));
  const sinT = Math.sin(theta);
  const w0 = Math.sin((1 - t) * theta) / sinT;
  const w1 = Math.sin(t * theta) / sinT;
  for (let i = 0; i < dim; i++) out[i] = w0 * a[i] + w1 * b[i];
  return normalizeInPlace(out);
}

/**
 * Extrinsic / Intrinsic Fréchet Mean on S^(d-1).
 * Starts at normalized weighted Euclidean mean and refines via Riemannian log/exp iterations.
 */
export function sphericalMean(vectors: Float64Array[], weights?: number[]): Float64Array {
  if (vectors.length === 0) return new Float64Array(0);
  const dim = vectors[0].length;
  const mu = new Float64Array(dim);
  for (let k = 0; k < vectors.length; k++) {
    const w = weights ? weights[k] : 1;
    const v = vectors[k];
    for (let i = 0; i < dim; i++) mu[i] += w * v[i];
  }
  normalizeInPlace(mu);
  if (norm(mu) < 1e-10) {
    // Antipodal cancellation fallback
    mu.set(vectors[0]);
    return normalizeInPlace(mu);
  }

  // 4 iterations of intrinsic Karcher/Fréchet refinement on S^(d-1)
  const tangent = new Float64Array(dim);
  for (let iter = 0; iter < 4; iter++) {
    tangent.fill(0);
    let wSum = 0;
    for (let k = 0; k < vectors.length; k++) {
      const w = weights ? weights[k] : 1;
      wSum += w;
      const v = vectors[k];
      const c = cosineSim(mu, v);
      const theta = Math.acos(c);
      if (theta < 1e-7) continue;
      const scale = (w * theta) / Math.sin(theta);
      for (let i = 0; i < dim; i++) {
        tangent[i] += scale * (v[i] - c * mu[i]);
      }
    }
    if (wSum <= 0) break;
    for (let i = 0; i < dim; i++) tangent[i] /= wSum;
    const tNorm = norm(tangent);
    if (tNorm < 1e-6) break;
    // Exponential map Exp_mu(tangent)
    const cosN = Math.cos(tNorm);
    const sinN = Math.sin(tNorm) / tNorm;
    for (let i = 0; i < dim; i++) {
      mu[i] = cosN * mu[i] + sinN * tangent[i];
    }
    normalizeInPlace(mu);
  }
  return mu;
}

/**
 * Orthogonal residual via Modified Gram-Schmidt:
 * Projects target vector g onto the orthogonal complement of span(basisVectors).
 * Used to isolate the truly NOVEL semantic dimensions of a gap vector!
 */
export function orthogonalResidual(target: Float64Array, basisVectors: Float64Array[]): Float64Array {
  const dim = target.length;
  // Orthonormalize basis via Modified Gram-Schmidt
  const ortho: Float64Array[] = [];
  for (const bv of basisVectors) {
    const u = new Float64Array(bv);
    for (const q of ortho) {
      const proj = dot(u, q);
      for (let i = 0; i < dim; i++) u[i] -= proj * q[i];
    }
    const n = norm(u);
    if (n > 1e-6) {
      for (let i = 0; i < dim; i++) u[i] /= n;
      ortho.push(u);
    }
  }
  const res = new Float64Array(target);
  for (const q of ortho) {
    const proj = dot(res, q);
    for (let i = 0; i < dim; i++) res[i] -= proj * q[i];
  }
  const rn = norm(res);
  if (rn > 1e-8) {
    for (let i = 0; i < dim; i++) res[i] /= rn;
  }
  return res;
}

/**
 * Compute pairwise cosine distance matrix (flat n x n Float64Array).
 */
export function pairwiseCosineDistanceMatrix(vectors: Float64Array[]): Float64Array {
  const n = vectors.length;
  const dist = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = cosineDist(vectors[i], vectors[j]);
      dist[i * n + j] = d;
      dist[j * n + i] = d;
    }
  }
  return dist;
}

/**
 * Exact Jacobi Eigenvalue Algorithm for real symmetric n x n matrices.
 * Returns eigenvalues and eigenvectors sorted in descending eigenvalue order.
 * Ideal for Gram matrices (N <= 200) in Exact PCA and Truncated SVD.
 */
export function jacobiSymmetricEigen(
  matrix: Float64Array,
  n: number,
  maxSweeps = 50
): { eigenvalues: Float64Array; eigenvectors: Float64Array[] } {
  const A = new Float64Array(matrix);
  const V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let maxOff = 0;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = Math.abs(A[p * n + q]);
        if (apq > maxOff) maxOff = apq;
      }
    }
    if (maxOff < 1e-10) break;

    const thresh = sweep < 4 ? (0.2 * maxOff) / (n * n) : 0;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p * n + q];
        if (Math.abs(apq) <= thresh || Math.abs(apq) < 1e-13) continue;

        const app = A[p * n + p];
        const aqq = A[q * n + q];
        const tau = (aqq - app) / (2 * apq);
        const t =
          tau >= 0
            ? 1 / (tau + Math.sqrt(1 + tau * tau))
            : -1 / (-tau + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;

        A[p * n + p] = app - t * apq;
        A[q * n + q] = aqq + t * apq;
        A[p * n + q] = 0;
        A[q * n + p] = 0;

        for (let r = 0; r < n; r++) {
          if (r === p || r === q) continue;
          const arp = A[r * n + p];
          const arq = A[r * n + q];
          const nrp = c * arp - s * arq;
          const nrq = s * arp + c * arq;
          A[r * n + p] = nrp;
          A[p * n + r] = nrp;
          A[r * n + q] = nrq;
          A[q * n + r] = nrq;
        }

        for (let r = 0; r < n; r++) {
          const vrp = V[r * n + p];
          const vrq = V[r * n + q];
          V[r * n + p] = c * vrp - s * vrq;
          V[r * n + q] = s * vrp + c * vrq;
        }
      }
    }
  }

  const pairs: Array<{ val: number; idx: number }> = [];
  for (let i = 0; i < n; i++) {
    pairs.push({ val: A[i * n + i], idx: i });
  }
  pairs.sort((x, y) => y.val - x.val);

  const eigenvalues = new Float64Array(n);
  const eigenvectors: Float64Array[] = [];
  for (let k = 0; k < n; k++) {
    eigenvalues[k] = pairs[k].val;
    const col = pairs[k].idx;
    const vec = new Float64Array(n);
    for (let r = 0; r < n; r++) vec[r] = V[r * n + col];
    eigenvectors.push(vec);
  }

  return { eigenvalues, eigenvectors };
}

/** Deterministic PRNG (Mulberry32) so manifold layouts & clustering are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
