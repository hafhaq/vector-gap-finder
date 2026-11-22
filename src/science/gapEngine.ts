/**
 * Full Scientific Vector-Space Gap & Structural-Hole Engine
 *
 * Combines:
 * 1. von Mises-Fisher (vMF) Spherical Kernel Density Estimation on S^(d-1)
 * 2. Vietoris-Rips Persistent Homology (H0 + H1 topological cavities in R^d)
 * 3. Spherical k-Means++ + Burt's Structural Hole Constraint & Bridge Entropy
 * 4. Bowyer-Watson Delaunay / Voronoi Alpha-Shape Interior Voids
 * 5. Riemannian Gradient Descent on S^(d-1) to locate exact local density valleys
 * 6. Gram-Schmidt Orthogonal Residual Concept Inversion to decode gap vectors into human concepts
 */

import {
  cosineDist,
  cosineSim,
  dot,
  normalize,
  normalizeInPlace,
  orthogonalResidual,
  slerp,
  sphericalMean,
} from './math.ts';
import { computeDelaunayAndAlphaShape } from './geometry.ts';
import { computePersistentHomology } from './topology.ts';
import { buildKnnGraph, sphericalKMeans } from './clustering.ts';
import { projectVectors } from './projection.ts';
import type {
  AnalysisConfig,
  AnalysisResult,
  ClusterInfo,
  CorpusItem,
  DecodedConceptMatch,
  EmbeddingEngineKind,
  GapCandidate,
  GapWeights,
  LexiconConcept,
  PersistencePair,
} from '../types.ts';

/**
 * Unnormalized shifted von Mises-Fisher Kernel Density on S^(d-1):
 * f_kappa(x) = (1/N) * sum_i exp(kappa * (x . v_i - 1)) in (0, 1]
 */
export function vmfDensity(
  x: Float64Array,
  corpusVectors: Float64Array[],
  kappa: number
): number {
  const n = corpusVectors.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = cosineSim(x, corpusVectors[i]);
    sum += Math.exp(kappa * (s - 1));
  }
  return sum / n;
}

/**
 * Riemannian Gradient Descent on unit hypersphere S^(d-1) to descend into a local
 * vMF density valley while staying anchored within the semantic convex support of the domain!
 *
 * Minimizes E(x) = log(f_kappa(x) + eps) + lambda_hull * (1 - x . mu_domain)^2
 */
export function refineGapRiemannian(
  seed: Float64Array,
  corpusVectors: Float64Array[],
  domainCentroid: Float64Array,
  kappa: number,
  steps = 16
): Float64Array {
  const dim = seed.length;
  const x = normalize(seed);
  const grad = new Float64Array(dim);
  const n = corpusVectors.length;
  const lambdaHull = 2.6;

  for (let step = 0; step < steps; step++) {
    const lr = 0.09 * (1 - step / (steps + 4));
    grad.fill(0);

    // Compute gradient of log f_kappa(x)
    let z = 0;
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const val = Math.exp(kappa * (cosineSim(x, corpusVectors[i]) - 1));
      w[i] = val;
      z += val;
    }
    const invZ = 1 / (z + 1e-12);
    for (let i = 0; i < n; i++) {
      const coeff = kappa * w[i] * invZ;
      const vi = corpusVectors[i];
      for (let d = 0; d < dim; d++) grad[d] += coeff * vi[d];
    }

    // Add domain coherence restoring force so we never drift into irrelevant outer space
    const cSim = cosineSim(x, domainCentroid);
    const hullCoeff = -2 * lambdaHull * (1 - cSim);
    for (let d = 0; d < dim; d++) {
      grad[d] += hullCoeff * domainCentroid[d];
    }

    // Project Euclidean gradient onto tangent space T_x S^(d-1)
    const radial = dot(x, grad);
    let tNormSq = 0;
    for (let d = 0; d < dim; d++) {
      grad[d] -= radial * x[d];
      tNormSq += grad[d] * grad[d];
    }
    const tNorm = Math.sqrt(tNormSq);
    if (tNorm < 1e-6) break;

    // Normalized step along negative Riemannian gradient (geodesic retraction)
    const stepSize = Math.min(lr, 0.08);
    const invT = stepSize / tNorm;
    for (let d = 0; d < dim; d++) {
      x[d] -= grad[d] * invT;
    }
    normalizeInPlace(x);
  }
  return x;
}

/**
 * Decode an arbitrary gap vector g in S^(d-1) back into ranked human-readable concepts.
 *
 * CRITICAL MATHEMATICAL SAFEGUARD against "Bystander Cluster Leakage":
 * The orthogonal complement of the 4 nearest neighbors N(g)^perp has dimension (d - 4) and
 * contains every unrelated third cluster C_3 in the corpus! For example, at a void between
 * C_0 = [Docker Containers · Linux] and C_1 = [PROFINET IRT · Synchronization], an unconstrained
 * orthogonal residual g_perp can point at C_3 = [Ladder Logic · Structured Text].
 *
 * Solution:
 * 1. Constrain the residual to the 2D/3D bridging plane spanned by the bridged clusters (C_0, C_1)
 *    minus the immediate anchor average, rather than unconstrained (d-4)-dimensional outer space!
 * 2. Require any domain-native concept (isNative) to have higher affinity to the bridged clusters
 *    (C_0 or C_1) than to any unrelated third cluster C_other!
 * 3. Enforce true bipartite bridge pairing: Pole A from Cluster C_0, Pole B from Cluster C_1,
 *    plus novel cross-domain catalysts from CAPABILITY_LEXICON.
 */
export function decodeGapVector(
  gapVec: Float64Array,
  nearestIndices: number[],
  corpusVectors: Float64Array[],
  domainCentroid: Float64Array,
  clusters: ClusterInfo[],
  bridgedClusters: GapCandidate['bridgedClusters'],
  lexicon: LexiconConcept[],
  lexiconVectors: Float64Array[],
  lexiconCorpusMaxSim: Float32Array,
  topK = 5
): DecodedConceptMatch[] {
  const neighborBasis = nearestIndices.slice(0, 4).map((idx) => corpusVectors[idx]);
  const rawResidual = orthogonalResidual(gapVec, neighborBasis);

  // Active bridged cluster centroids (C_0, C_1)
  const c0 = bridgedClusters[0] ? clusters[bridgedClusters[0].clusterId] : clusters[0];
  const c1 = bridgedClusters[1] ? clusters[bridgedClusters[1].clusterId] : undefined;
  const activeClusterIds = new Set(bridgedClusters.slice(0, 2).map((b) => b.clusterId));

  const scored: Array<DecodedConceptMatch & { pole: 'c0' | 'c1' | 'catalyst' }> = [];

  for (let m = 0; m < lexicon.length; m++) {
    const lv = lexiconVectors[m];
    if (!lv || lv.length !== gapVec.length) continue;

    const lvNorm = Math.sqrt(dot(lv, lv));
    if (lvNorm < 0.25) continue;

    const sim = cosineSim(gapVec, lv);
    const domainAlign = cosineSim(domainCentroid, lv);
    const resAlign = cosineSim(rawResidual, lv);
    const isNative =
      lexicon[m].domain === 'Domain Theme' ||
      lexicon[m].domain === 'Domain Tag' ||
      lexicon[m].domain === 'Title Concept' ||
      lexicon[m].domain === 'Corpus Concept' ||
      lexicon[m].domain === 'Corpus Theme';

    if (!isNative && (sim < 0.26 || domainAlign < 0.18 || lexiconCorpusMaxSim[m] < 0.22)) {
      continue;
    }
    if (isNative && sim < 0.10) {
      continue;
    }

    // Check cluster affinity across all clusters to block Bystander Cluster C_3 leakage!
    const simC0 = c0 ? cosineSim(c0.centroid, lv) : sim;
    const simC1 = c1 ? cosineSim(c1.centroid, lv) : simC0;
    const maxBridgedSim = Math.max(simC0, simC1);

    if (isNative && clusters.length >= 3 && activeClusterIds.size >= 1) {
      let maxBystanderSim = -1;
      for (const cl of clusters) {
        if (activeClusterIds.has(cl.id)) continue;
        const s = cosineSim(cl.centroid, lv);
        if (s > maxBystanderSim) maxBystanderSim = s;
      }
      // If a corpus phrase belongs much more strongly to an unrelated bystander cluster C_3
      // than to either of the bridged clusters (C_0, C_1), reject it!
      if (maxBystanderSim > maxBridgedSim + 0.04) {
        continue;
      }
    }

    // Bridge balance bonus: reward concepts that either anchor one pole cleanly or bridge both
    const bridgeSupport = c1
      ? 0.55 * maxBridgedSim + 0.45 * Math.min(simC0, simC1)
      : simC0;

    let localMaxSim = -1;
    for (const bv of neighborBasis) {
      const s = cosineSim(lv, bv);
      if (s > localMaxSim) localMaxSim = s;
    }
    const maxCorpusSim = lexiconCorpusMaxSim[m];
    const novelty = isNative
      ? Math.max(0, Math.min(1, 1 - Math.max(0, localMaxSim)))
      : Math.max(0, Math.min(1, 1 - Math.max(0, maxCorpusSim)));

    const rawCombined =
      0.46 * Math.max(0, sim) +
      0.26 * Math.max(0, bridgeSupport) +
      0.14 * Math.max(0, resAlign) +
      0.14 * novelty * Math.max(0.15, (sim + 1) * 0.5);
    const combined = isNative ? rawCombined * 1.12 : rawCombined * 1.06;

    const pole: 'c0' | 'c1' | 'catalyst' = !isNative
      ? 'catalyst'
      : c1 && simC1 > simC0
        ? 'c1'
        : 'c0';

    scored.push({
      term: lexicon[m].term,
      domain: lexicon[m].domain,
      description: lexicon[m].description,
      similarity: sim,
      novelty,
      residualAlignment: resAlign,
      combinedScore: combined,
      pole,
    });
  }

  scored.sort((a, b) => b.combinedScore - a.combinedScore);

  const hasOverlap = (a: string, b: string): boolean => {
    const wa = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length >= 4));
    return b
      .toLowerCase()
      .split(/\s+/)
      .some((w) => w.length >= 4 && wa.has(w));
  };

  // True Bipartite Selection: ensure the top 2 concepts represent BOTH sides of the structural hole
  // (or 1 bridge pole + 1 novel cross-domain catalyst) rather than two terms from the same side!
  const picked: DecodedConceptMatch[] = [];
  const tryPick = (cand: (typeof scored)[number]): boolean => {
    if (picked.some((p) => hasOverlap(p.term, cand.term))) return false;
    picked.push(cand);
    return true;
  };

  if (c1) {
    const bestC0 = scored.find((s) => s.pole === 'c0');
    const bestC1 = scored.find((s) => s.pole === 'c1' && (!bestC0 || !hasOverlap(bestC0.term, s.term)));
    const bestCat = scored.find((s) => s.pole === 'catalyst');

    // Pair the strongest pole/catalyst combination
    if (bestC0 && bestC1) {
      if (bestCat && bestCat.combinedScore >= Math.min(bestC0.combinedScore, bestC1.combinedScore) * 0.94) {
        // Pair the stronger cluster pole with the cross-domain architectural catalyst!
        tryPick(bestC0.combinedScore >= bestC1.combinedScore ? bestC0 : bestC1);
        tryPick(bestCat);
      } else {
        tryPick(bestC0);
        tryPick(bestC1);
      }
    }
  }

  for (const item of scored) {
    if (picked.length >= topK) break;
    tryPick(item);
  }
  return picked;
}

export interface GapEvaluationContext {
  items: CorpusItem[];
  vectors: Float64Array[];
  clusters: ClusterInfo[];
  assignments: Int32Array;
  h1Cycles: PersistencePair[];
  lexicon: LexiconConcept[];
  lexiconVectors: Float64Array[];
  lexiconCorpusMaxSim: Float32Array;
  domainCentroid: Float64Array;
  corpusDensityMin: number;
  corpusDensityMax: number;
  meanPairwiseDist: number;
  vmfKappa: number;
  weights: GapWeights;
  projectOutOfSample: (v: Float64Array) => [number, number];
}

/**
 * Evaluate ANY vector g on S^(d-1) with the exact White-Space Index scorecard
 * and orthogonal concept decoder. Works for auto-discovered gaps, click probes, and vector algebra!
 */
export function evaluateGapCandidate(
  id: string,
  sourceMethod: GapCandidate['sourceMethod'],
  vec: Float64Array,
  ctx: GapEvaluationContext,
  overridePos2d?: [number, number],
  cycleVertices?: number[]
): GapCandidate {
  const unitVec = normalize(vec);
  const {
    items,
    vectors,
    clusters,
    assignments,
    h1Cycles,
    lexicon,
    lexiconVectors,
    lexiconCorpusMaxSim,
    domainCentroid,
    corpusDensityMin,
    corpusDensityMax,
    meanPairwiseDist,
    vmfKappa,
    weights,
    projectOutOfSample,
  } = ctx;

  // 1. Nearest existing offerings in full R^d
  const sims = vectors.map((v, index) => ({
    index,
    sim: cosineSim(unitVec, v),
  }));
  sims.sort((a, b) => b.sim - a.sim);

  const nearestSim = sims[0]?.sim ?? 0;
  const nearestDistance = 1 - nearestSim;

  // 2. Spherical vMF Density & Sparsity score
  const density = vmfDensity(unitVec, vectors, vmfKappa);
  const densRange = Math.max(1e-6, corpusDensityMax - corpusDensityMin);
  const normalizedDensity = Math.max(
    0,
    Math.min(1, (density - corpusDensityMin) / densRange)
  );
  // Combine normalized empty-ball radius + low spherical KDE density
  const distNorm = Math.max(0, Math.min(1, nearestDistance / Math.max(0.22, meanPairwiseDist * 1.15)));
  const sparsity = Math.max(0, Math.min(1, 0.58 * distNorm + 0.42 * (1 - normalizedDensity)));

  // 3. Cross-Cluster Bridge Entropy (Shannon entropy over soft-weighted top-k neighbors)
  const kNbr = Math.min(10, vectors.length);
  const clusterWeights = new Float64Array(clusters.length);
  let totalW = 0;
  const topSim = sims[0]?.sim ?? 0;
  for (let m = 0; m < kNbr; m++) {
    const nb = sims[m];
    const w = Math.exp(6.5 * (nb.sim - topSim));
    const cid = assignments[nb.index];
    clusterWeights[cid] += w;
    totalW += w;
  }

  let entropy = 0;
  const bridgedClusters: GapCandidate['bridgedClusters'] = [];
  for (let c = 0; c < clusters.length; c++) {
    const p = totalW > 0 ? clusterWeights[c] / totalW : 0;
    if (p > 1e-4) {
      entropy -= p * Math.log(p);
    }
    if (p >= 0.14) {
      bridgedClusters.push({
        clusterId: c,
        label: clusters[c].label,
        weight: p,
        color: clusters[c].color,
      });
    }
  }
  bridgedClusters.sort((a, b) => b.weight - a.weight);
  const maxEntropy = Math.log(Math.min(4, clusters.length));
  const bridgeEntropy = maxEntropy > 1e-6 ? Math.min(1, entropy / maxEntropy) : 0;

  // 4. Domain Manifold Coherence (Goldilocks support: inside the domain hull, not random noise!)
  // Measured by similarity to domain centroid + mean similarity to top-5 surrounding anchors
  const centroidSim = cosineSim(unitVec, domainCentroid);
  const top5MeanSim =
    sims.slice(0, Math.min(5, sims.length)).reduce((s, x) => s + x.sim, 0) /
    Math.min(5, sims.length);
  // Smooth bell/ramp: rewards strong domain support without penalizing genuine empty voids
  const supportRaw = 0.5 * Math.max(0, centroidSim) + 0.5 * Math.max(0, top5MeanSim);
  const coherence = Math.max(0, Math.min(1, supportRaw / Math.max(0.28, 1 - meanPairwiseDist * 0.55)));

  // 5. Topological Persistence Alignment (proximity to verified high-persistence H1 cavities!)
  let topoPersistence = 0;
  const maxH1Pers = h1Cycles[0]?.persistence ?? 0;
  if (maxH1Pers > 1e-4) {
    for (const cyc of h1Cycles.slice(0, 12)) {
      if (!cyc.barycenter) continue;
      const align = Math.max(0, cosineSim(unitVec, cyc.barycenter));
      const score = (cyc.persistence / maxH1Pers) * Math.pow(align, 3);
      if (score > topoPersistence) topoPersistence = score;
    }
  }

  // 6. Composite White-Space Opportunity Score
  const wSum = Math.max(
    1e-6,
    weights.sparsity + weights.bridgeEntropy + weights.coherence + weights.topology
  );
  const rawOpp =
    (weights.sparsity * sparsity +
      weights.bridgeEntropy * bridgeEntropy +
      weights.coherence * coherence +
      weights.topology * topoPersistence) /
    wSum;

  // Multiplicative domain-support gate so out-of-domain nonsense can never score high
  const gate = 0.4 + 0.6 * Math.pow(coherence, 0.6);
  const opportunityScore = Math.max(0, Math.min(1, rawOpp * gate));

  // 7. Decode gap vector via Bipartite Cluster-Constrained Concept Inversion
  const nearestIndices = sims.slice(0, 5).map((s) => s.index);
  const decodedConcepts = decodeGapVector(
    unitVec,
    nearestIndices,
    vectors,
    domainCentroid,
    clusters,
    bridgedClusters,
    lexicon,
    lexiconVectors,
    lexiconCorpusMaxSim,
    5
  );

  // Synthesize crisp human-readable title & executive plain-English thesis
  const c0 = bridgedClusters[0]?.label ?? 'Core Domain';
  const c1 = bridgedClusters[1]?.label;
  const topA = decodedConcepts[0]?.term;
  const topB = decodedConcepts[1]?.term;
  const catalyst = decodedConcepts.find(
    (d) =>
      d.domain !== 'Domain Theme' &&
      d.domain !== 'Domain Tag' &&
      d.domain !== 'Title Concept' &&
      d.domain !== 'Corpus Concept' &&
      d.domain !== 'Corpus Theme'
  );

  const synthesizedTitle =
    topA && topB
      ? `${topA} × ${topB}`
      : c1
        ? `${c0} × ${c1}`
        : topA
          ? `${topA} Frontier`
          : `${c0} Unexplored Niche`;

  const anchorNames = nearestIndices
    .slice(0, 3)
    .map((idx) => items[idx].title)
    .join('", "');

  let coOccurCount = 0;
  if (topA && topB) {
    const wordsA = topA.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    const wordsB = topB.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    for (const it of items) {
      const hay = `${it.title} ${it.summary} ${(it.tags ?? []).join(' ')}`.toLowerCase();
      const hasA = wordsA.length > 0 && wordsA.every((w) => hay.includes(w));
      const hasB = wordsB.length > 0 && wordsB.every((w) => hay.includes(w));
      if (hasA && hasB) coOccurCount++;
    }
  }

  const missingPhrase = topA
    ? `${topA.toLowerCase()}${topB ? ` with ${topB.toLowerCase()}` : ''}`
    : c1
      ? `${c0.toLowerCase()} with ${c1.toLowerCase()}`
      : 'an unrepresented semantic bridge';

  const coOccurProof =
    topA && topB ? ` (${coOccurCount} of ${items.length} corpus items combine both; ` : ' (';

  const synthesizedHypothesis =
    bridgedClusters.length >= 2
      ? `Structural hole between [${c0}] and [${c1}]${coOccurProof}void radius ${nearestDistance.toFixed(2)}, bridge entropy ${(bridgeEntropy * 100).toFixed(0)}%). Surrounded by "${anchorNames}" without uniting ${missingPhrase}.`
      : `Low-density frontier adjacent to "${anchorNames}"${coOccurProof}void radius ${nearestDistance.toFixed(2)}). Orthogonal residual projection highlights ${missingPhrase} as an underrepresented direction.`;

  // Generate explicit 4-part Human-Readable Executive Summary
  const anchor0 = items[nearestIndices[0]]?.title ?? c0;
  const anchor1 = items[nearestIndices[1]]?.title ?? c1 ?? c0;
  const anchor2 = items[nearestIndices[2]]?.title;
  const humanSummary = {
    sideA: `[${c0}] — anchored by "${anchor0}"`,
    sideB: c1 ? `[${c1}] — anchored by "${anchor1}"${anchor2 ? ` and "${anchor2}"` : ''}` : `Adjacent frontier around "${anchor1}"`,
    untappedThesis:
      c1 && topA && topB
        ? `Build a bridge between [${c0}] and [${c1}] by combining ${topA} with ${topB}${catalyst && catalyst.term !== topA && catalyst.term !== topB ? ` (enabled via ${catalyst.term}: ${catalyst.description.toLowerCase()})` : ''}.`
        : `Introduce ${topA ?? c0}${topB ? ` paired with ${topB}` : ''} into the empty space bordering "${anchor0}" and "${anchor1}".`,
    whyHighSignal:
      `${coOccurCount === 0 ? `Zero existing items (0/${items.length}) combine these two capabilities` : `Only ${coOccurCount}/${items.length} items touch both sides`}, yet the spot sits directly between ${bridgedClusters.length >= 2 ? `${bridgedClusters.length} active clusters (${(bridgeEntropy * 100).toFixed(0)}% bridge entropy)` : 'established offerings'} with a cosine void radius of ${nearestDistance.toFixed(2)}${topoPersistence > 0.35 ? ` inside a verified H₁ topological ring cavity` : ''}.`,
  };

  const pos2d = overridePos2d ?? projectOutOfSample(unitVec);

  return {
    id,
    sourceMethod,
    vector: unitVec,
    pos2d,
    opportunityScore,
    metrics: {
      sparsity,
      nearestDistance,
      vmfDensity: density,
      normalizedDensity,
      bridgeEntropy,
      coherence,
      topoPersistence,
    },
    nearestExisting: sims.slice(0, 4).map((s) => ({
      index: s.index,
      id: items[s.index].id,
      title: items[s.index].title,
      similarity: s.sim,
      clusterId: assignments[s.index],
    })),
    bridgedClusters,
    decodedConcepts,
    synthesizedTitle,
    synthesizedHypothesis,
    humanSummary,
    cycleVertices,
  };
}

/**
 * Compute 2D density contour field using RBF-lifted vMF density (evaluated fast on a grid)
 * so the background heatmap reflects TRUE high-dimensional spherical density!
 */
function compute2DDensityField(
  positions2d: Array<[number, number]>,
  vectors: Float64Array[],
  lift2DToSphere: (x: number, y: number) => Float64Array,
  kappa: number,
  gridSize = 48
): { size: number; values: Float32Array; min: number; max: number } {
  const values = new Float32Array(gridSize * gridSize);
  let min = Infinity;
  let max = -Infinity;

  // Combine 2D spatial proximity envelope with true lifted vMF density
  for (let gy = 0; gy < gridSize; gy++) {
    const y = -1.05 + (gy / (gridSize - 1)) * 2.1;
    for (let gx = 0; gx < gridSize; gx++) {
      const x = -1.05 + (gx / (gridSize - 1)) * 2.1;
      // Fast spatial kernel falloff so exterior ocean fades cleanly
      let spatial = 0;
      for (let i = 0; i < positions2d.length; i++) {
        const dx = x - positions2d[i][0];
        const dy = y - positions2d[i][1];
        spatial += Math.exp(-(dx * dx + dy * dy) / 0.065);
      }
      spatial /= positions2d.length;

      let v = spatial;
      if (spatial > 0.008) {
        const lifted = lift2DToSphere(x, y);
        const sphereD = vmfDensity(lifted, vectors, kappa);
        v = 0.55 * spatial + 0.45 * sphereD * Math.min(1, spatial * 5.5);
      }
      values[gy * gridSize + gx] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { size: gridSize, values, min, max };
}

export interface RunAnalysisParams {
  engine: EmbeddingEngineKind;
  items: CorpusItem[];
  vectors: Float64Array[];
  lexicon: LexiconConcept[];
  lexiconVectors: Float64Array[];
  extractKeywords: (indices: number[], topK?: number) => string[];
  config: AnalysisConfig;
}

export interface FullEngineOutput {
  result: AnalysisResult;
  evalContext: GapEvaluationContext;
  lift2DToSphere: (x: number, y: number) => Float64Array;
}

/**
 * Execute the complete scientific pipeline end-to-end.
 */
export function runVectorGapAnalysis(params: RunAnalysisParams): FullEngineOutput {
  const t0 = performance.now();
  const { engine, items, vectors, lexicon, lexiconVectors, extractKeywords, config } = params;
  const n = vectors.length;
  const dim = vectors[0]?.length ?? 0;

  // 1. Domain centroid & baseline pairwise distance statistics
  const domainCentroid = sphericalMean(vectors);
  let pairSum = 0;
  let pairCount = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairSum += cosineDist(vectors[i], vectors[j]);
      pairCount++;
    }
  }
  const meanPairwiseDist = pairCount > 0 ? pairSum / pairCount : 0.5;

  // Baseline vMF density across existing corpus items
  let corpusDensityMin = Infinity;
  let corpusDensityMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const d = vmfDensity(vectors[i], vectors, config.vmfKappa);
    if (d < corpusDensityMin) corpusDensityMin = d;
    if (d > corpusDensityMax) corpusDensityMax = d;
  }

  // Novelty baseline for each lexicon concept (max cosine sim to any existing corpus item)
  const lexiconCorpusMaxSim = new Float32Array(lexicon.length);
  for (let m = 0; m < lexicon.length; m++) {
    const lv = lexiconVectors[m];
    let maxS = -1;
    if (lv && lv.length === dim) {
      for (let i = 0; i < n; i++) {
        const s = cosineSim(lv, vectors[i]);
        if (s > maxS) maxS = s;
      }
    }
    lexiconCorpusMaxSim[m] = maxS;
  }

  // 2. Spherical k-Means++ clustering + k-NN similarity graph
  const { clusters, assignments } = sphericalKMeans(vectors, config.numClusters, extractKeywords);
  const knnEdges = buildKnnGraph(vectors, 4);

  // 3. Manifold / PCA 2D Projection + Quality Metrics
  const proj = projectVectors(vectors, config.projection);

  // 4. Bowyer-Watson Delaunay & Alpha-Shape Interior Voids
  const delaunay = computeDelaunayAndAlphaShape(proj.positions2d);

  // 5. Exact Vietoris-Rips Persistent Homology (H0 + H1 cavities in full R^d!)
  const persistence = computePersistentHomology(vectors);
  const h1Cycles = persistence.filter((p) => p.dimension === 1);

  const evalContext: GapEvaluationContext = {
    items,
    vectors,
    clusters,
    assignments,
    h1Cycles,
    lexicon,
    lexiconVectors,
    lexiconCorpusMaxSim,
    domainCentroid,
    corpusDensityMin,
    corpusDensityMax,
    meanPairwiseDist,
    vmfKappa: config.vmfKappa,
    weights: config.weights,
    projectOutOfSample: proj.projectOutOfSample,
  };

  // 6. Multi-Mechanism Scientific Candidate Generation
  interface RawCandidate {
    sourceMethod: GapCandidate['sourceMethod'];
    vec: Float64Array;
    pos2d?: [number, number];
    cycleVertices?: number[];
  }
  const rawCandidates: RawCandidate[] = [];

  // (A) Exact Vietoris-Rips H1 Persistent Cavity Barycenters
  for (let i = 0; i < Math.min(12, h1Cycles.length); i++) {
    const cyc = h1Cycles[i];
    if (!cyc.barycenter) continue;
    rawCandidates.push({
      sourceMethod: 'h1-cavity',
      vec: cyc.barycenter,
      cycleVertices: cyc.cycleVertices,
    });
    // Also refine top H1 cavities via Riemannian gradient descent on S^(d-1)
    if (i < 6) {
      rawCandidates.push({
        sourceMethod: 'riemannian-min',
        vec: refineGapRiemannian(cyc.barycenter, vectors, domainCentroid, config.vmfKappa),
        cycleVertices: cyc.cycleVertices,
      });
    }
  }

  // (B) Inter-Cluster Geodesic Bridges (SLERP midpoints between every distinct cluster pair)
  for (let a = 0; a < clusters.length; a++) {
    for (let b = a + 1; b < clusters.length; b++) {
      const mid = slerp(clusters[a].centroid, clusters[b].centroid, 0.5);
      rawCandidates.push({
        sourceMethod: 'geodesic-bridge',
        vec: mid,
      });
      // Refined density valley along the inter-cluster bridge
      rawCandidates.push({
        sourceMethod: 'riemannian-min',
        vec: refineGapRiemannian(mid, vectors, domainCentroid, config.vmfKappa),
      });
    }
  }

  // (C) Alpha-Shape Interior Voronoi Circumcenters lifted back to S^(d-1)
  const interiorTris = delaunay
    .filter((t) => t.inAlphaShape)
    .sort((a, b) => b.radius - a.radius)
    .slice(0, 14);

  for (const tri of interiorTris) {
    // Combine spherical Fréchet mean of triangle vertices with RBF lifted circumcenter
    const triMean = sphericalMean([vectors[tri.a], vectors[tri.b], vectors[tri.c]]);
    const lifted = proj.lift2DToSphere(tri.cx, tri.cy);
    const hybrid = slerp(triMean, lifted, 0.5);
    rawCandidates.push({
      sourceMethod: 'voronoi-void',
      vec: hybrid,
      pos2d: [tri.cx, tri.cy],
      cycleVertices: [tri.a, tri.b, tri.c],
    });
  }

  // Score all candidates
  const evaluated = rawCandidates.map((rc, idx) =>
    evaluateGapCandidate(
      `gap-raw-${idx}`,
      rc.sourceMethod,
      rc.vec,
      evalContext,
      rc.pos2d,
      rc.cycleVertices
    )
  );

  // Sort by composite White-Space Opportunity Score descending
  evaluated.sort((a, b) => b.opportunityScore - a.opportunityScore);

  // Non-Maximum Suppression (NMS) on S^(d-1) + 2D distance so every surfaced gap is distinct!
  const gaps: GapCandidate[] = [];
  const usedTitles = new Set<string>();
  const conceptUsage = new Map<string, number>();
  const canonicalKey = (t: string) =>
    t
      .toLowerCase()
      .split(/\s*[×↔]\s*/)
      .map((s) => s.trim())
      .sort()
      .join(' × ');

  for (const cand of evaluated) {
    if (gaps.length >= config.topKGaps) break;
    // Ensure candidate isn't practically sitting on top of an existing offering
    if (cand.metrics.nearestDistance < 0.08) continue;
    const tooClose = gaps.some((kept) => {
      const dSphere = cosineDist(cand.vector, kept.vector);
      const d2d = Math.hypot(cand.pos2d[0] - kept.pos2d[0], cand.pos2d[1] - kept.pos2d[1]);
      return dSphere < 0.14 || d2d < 0.18;
    });
    if (tooClose) continue;

    // Pick the highest-scoring pair (termA, termB) from cand.decodedConcepts where neither
    // term has already dominated >= 2 higher-ranked gap titles and the pair is unique!
    let bestPair: [string, string] | null = null;
    const dcs = cand.decodedConcepts;
    for (let i = 0; i < dcs.length; i++) {
      for (let j = i + 1; j < dcs.length; j++) {
        const a = dcs[i].term;
        const b = dcs[j].term;
        const key = canonicalKey(`${a} × ${b}`);
        if (usedTitles.has(key)) continue;
        const uA = conceptUsage.get(a.toLowerCase()) ?? 0;
        const uB = conceptUsage.get(b.toLowerCase()) ?? 0;
        if (uA < 1 && uB < 1) {
          bestPair = [a, b];
          break;
        }
        if (!bestPair && uA < 2 && uB < 2) {
          bestPair = [a, b];
        }
      }
      if (bestPair && (conceptUsage.get(bestPair[0].toLowerCase()) ?? 0) === 0 && (conceptUsage.get(bestPair[1].toLowerCase()) ?? 0) === 0) {
        break;
      }
    }

    let title = cand.synthesizedTitle;
    let hypothesis = cand.synthesizedHypothesis;
    if (bestPair) {
      title = `${bestPair[0]} × ${bestPair[1]}`;
      hypothesis = hypothesis.replace(
        /without uniting .+$/,
        `without uniting ${bestPair[0].toLowerCase()} with ${bestPair[1].toLowerCase()}.`
      );
      conceptUsage.set(bestPair[0].toLowerCase(), (conceptUsage.get(bestPair[0].toLowerCase()) ?? 0) + 1);
      conceptUsage.set(bestPair[1].toLowerCase(), (conceptUsage.get(bestPair[1].toLowerCase()) ?? 0) + 1);
    } else if (usedTitles.has(canonicalKey(title))) {
      const bc0 = cand.bridgedClusters[0]?.label;
      const bc1 = cand.bridgedClusters[1]?.label;
      if (bc0 && bc1 && !usedTitles.has(canonicalKey(`${bc0} ↔ ${bc1}`))) {
        title = `${bc0} ↔ ${bc1}`;
      }
    }
    usedTitles.add(canonicalKey(title));

    gaps.push({
      ...cand,
      id: `gap-${gaps.length + 1}`,
      synthesizedTitle: title,
      synthesizedHypothesis: hypothesis,
    });
  }

  // 7. Compute 2D projected vMF density heatmap
  const densityGrid = compute2DDensityField(
    proj.positions2d,
    vectors,
    proj.lift2DToSphere,
    config.vmfKappa,
    46
  );

  const computeMs = Math.round(performance.now() - t0);

  return {
    result: {
      engine,
      dimensions: dim,
      computeMs,
      items,
      vectors,
      positions2d: proj.positions2d,
      projectionQuality: {
        method: config.projection,
        trustworthiness: proj.trustworthiness,
        kruskalStress: proj.kruskalStress,
        varianceExplained: proj.varianceExplained,
      },
      eigenSpectrum: proj.eigenSpectrum,
      clusters,
      delaunay,
      knnEdges,
      persistence,
      gaps,
      densityGrid,
      lexiconVectors,
      lexiconCorpusMaxSim,
      domainCentroid,
      meanPairwiseDist,
    },
    evalContext,
    lift2DToSphere: proj.lift2DToSphere,
  };
}
