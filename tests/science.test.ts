import assert from 'node:assert/strict';
import {
  cosineSim,
  dot,
  jacobiSymmetricEigen,
  norm,
  normalize,
  orthogonalResidual,
  slerp,
  sphericalMean,
} from '../src/science/math.ts';
import { computeDelaunayAndAlphaShape } from '../src/science/geometry.ts';
import { computePersistentHomology } from '../src/science/topology.ts';
import { fitLsaSpace } from '../src/science/lsa.ts';
import { runVectorGapAnalysis, vmfDensity, refineGapRiemannian } from '../src/science/gapEngine.ts';
import { PRESET_DATASETS } from '../src/data/presets.ts';
import { CAPABILITY_LEXICON } from '../src/data/lexicon.ts';

function runTest(name: string, fn: () => void): void {
  fn();
  console.log(`  ✓ ${name}`);
}

console.log('Running VoidLens Mathematical Verification Suite...\n');

runTest('Jacobi symmetric eigensolver satisfies A v = λ v to 1e-8', () => {
  const n = 4;
  const A = new Float64Array([
    4, 1, -2, 2,
    1, 2, 0, 1,
    -2, 0, 3, -2,
    2, 1, -2, -1,
  ]);
  const { eigenvalues, eigenvectors } = jacobiSymmetricEigen(A, n);
  for (let k = 0; k < n; k++) {
    const v = eigenvectors[k];
    const lam = eigenvalues[k];
    assert.ok(Math.abs(norm(v) - 1) < 1e-8, 'eigenvector unit norm');
    for (let r = 0; r < n; r++) {
      let av = 0;
      for (let c = 0; c < n; c++) av += A[r * n + c] * v[c];
      assert.ok(Math.abs(av - lam * v[r]) < 1e-7, `eigen residual row ${r}`);
    }
  }
});

runTest('SLERP & Spherical Fréchet mean preserve S^(d-1) geometry', () => {
  const a = normalize(new Float64Array([1, 0, 0, 0]));
  const b = normalize(new Float64Array([0, 1, 0, 0]));
  const mid = slerp(a, b, 0.5);
  assert.ok(Math.abs(norm(mid) - 1) < 1e-9);
  assert.ok(Math.abs(cosineSim(mid, a) - Math.SQRT1_2) < 1e-7);
  assert.ok(Math.abs(cosineSim(mid, b) - Math.SQRT1_2) < 1e-7);

  const mu = sphericalMean([a, b]);
  assert.ok(Math.abs(cosineSim(mu, mid) - 1) < 1e-7);
});

runTest('Modified Gram-Schmidt orthogonal residual is strictly orthogonal to neighbors', () => {
  const b1 = normalize(new Float64Array([1, 0.2, 0, 0]));
  const b2 = normalize(new Float64Array([0.1, 1, 0.2, 0]));
  const target = normalize(new Float64Array([0.5, 0.5, 0.5, 0.5]));
  const res = orthogonalResidual(target, [b1, b2]);
  assert.ok(Math.abs(norm(res) - 1) < 1e-8);
  assert.ok(Math.abs(dot(res, b1)) < 1e-8, 'orthogonal to b1');
  assert.ok(Math.abs(dot(res, b2)) < 1e-8, 'orthogonal to b2');
});

runTest('Vietoris-Rips H1 Persistent Homology detects ground-truth spherical ring cavity', () => {
  // Construct 12 points forming a ring at latitude 45° around the North Pole [0, 0, 1]
  const ring: Float64Array[] = [];
  const ringN = 12;
  const r = Math.sin(Math.PI / 4);
  const z = Math.cos(Math.PI / 4);
  for (let i = 0; i < ringN; i++) {
    const theta = (2 * Math.PI * i) / ringN;
    ring.push(normalize(new Float64Array([r * Math.cos(theta), r * Math.sin(theta), z])));
  }

  const pairs = computePersistentHomology(ring);
  const h1 = pairs.filter((p) => p.dimension === 1);
  assert.ok(h1.length >= 1, 'must detect at least one H1 cavity');
  assert.ok(h1[0].persistence > 0.15, `expected strong H1 persistence, got ${h1[0].persistence}`);
  assert.ok(h1[0].barycenter, 'H1 cycle must have Fréchet barycenter');

  // The barycenter of the ring must point straight at the empty North Pole [0, 0, 1]!
  const pole = new Float64Array([0, 0, 1]);
  const alignment = cosineSim(h1[0].barycenter!, pole);
  assert.ok(alignment > 0.99, `expected barycenter aligned with hole center, got cos=${alignment}`);
});

runTest('Bowyer-Watson Delaunay triangulation satisfies empty-circumcircle invariant', () => {
  const pts: Array<[number, number]> = [
    [-0.7, -0.6], [0.6, -0.7], [0.8, 0.2], [0.1, 0.8],
    [-0.6, 0.5], [-0.1, -0.1], [0.3, 0.25], [-0.35, 0.15],
  ];
  const tris = computeDelaunayAndAlphaShape(pts);
  assert.ok(tris.length >= 6);
  for (const t of tris) {
    for (let i = 0; i < pts.length; i++) {
      if (i === t.a || i === t.b || i === t.c) continue;
      const d = Math.hypot(pts[i][0] - t.cx, pts[i][1] - t.cy);
      assert.ok(d >= t.radius - 1e-6, `Delaunay empty-circle violated by vertex ${i}`);
    }
  }
});

runTest('Riemannian gradient descent reduces vMF density from a crowded seed', () => {
  const c1 = normalize(new Float64Array([0.9, 0.43, 0, 0]));
  const c2 = normalize(new Float64Array([0.9, -0.43, 0, 0]));
  const corpus = [
    c1,
    normalize(new Float64Array([0.88, 0.47, 0.05, 0])),
    c2,
    normalize(new Float64Array([0.88, -0.47, -0.05, 0])),
  ];
  const domainMean = sphericalMean(corpus);
  const start = slerp(c1, c2, 0.25); // biased close to c1
  const dBefore = vmfDensity(start, corpus, 8);
  const refined = refineGapRiemannian(start, corpus, domainMean, 8, 20);
  const dAfter = vmfDensity(refined, corpus, 8);
  assert.ok(Math.abs(norm(refined) - 1) < 1e-8);
  assert.ok(dAfter <= dBefore + 1e-5, `expected valley descent: ${dBefore} -> ${dAfter}`);
});

runTest('End-to-end Industrial PLC (2026) pipeline surfaces ranked high-dimensional gaps', () => {
  const plcPreset = PRESET_DATASETS[0];
  const corpusTexts = plcPreset.items.map((it) => `${it.title}. ${it.summary}`);
  const lexTexts = CAPABILITY_LEXICON.map((l) => `${l.term}. ${l.domain}. ${l.description}`);
  const lsa = fitLsaSpace(corpusTexts, lexTexts, 32);

  const output = runVectorGapAnalysis({
    engine: 'lsa-svd',
    items: plcPreset.items,
    vectors: lsa.corpusVectors,
    lexicon: CAPABILITY_LEXICON,
    lexiconVectors: lsa.lexiconVectors,
    extractKeywords: lsa.extractTopKeywords,
    config: {
      projection: 'manifold',
      numClusters: 6,
      vmfKappa: 6,
      topKGaps: 8,
      weights: { sparsity: 0.38, bridgeEntropy: 0.3, coherence: 0.18, topology: 0.14 },
    },
  });

  const { result } = output;
  assert.equal(result.items.length, plcPreset.items.length);
  assert.ok(result.gaps.length >= 4, `expected >= 4 gaps, got ${result.gaps.length}`);
  assert.ok(result.projectionQuality.trustworthiness > 0.65, `trustworthiness too low: ${result.projectionQuality.trustworthiness}`);
  const h1Count = result.persistence.filter((p) => p.dimension === 1).length;
  assert.ok(h1Count >= 1, `expected persistent H1 cavities, got ${h1Count}`);

  for (const g of result.gaps) {
    assert.ok(g.opportunityScore > 0 && g.opportunityScore <= 1);
    assert.ok(g.decodedConcepts.length >= 3);
    assert.ok(g.nearestExisting.length >= 3);
  }

  console.log(`\n  Top discovered Industrial PLC (2026) structural holes:`);
  result.gaps.slice(0, 4).forEach((g, i) => {
    console.log(
      `    #${i + 1} [${(g.opportunityScore * 100).toFixed(0)}%] ${g.synthesizedTitle} (${g.sourceMethod}, void=${g.metrics.nearestDistance.toFixed(2)})`
    );
  });
});

console.log('\nAll mathematical verification tests passed!');
