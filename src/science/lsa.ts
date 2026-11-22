/**
 * Scientific Local Semantic Embedding Engine:
 * Sublinear TF-IDF + Bigrams + Character 4-Gram Morphological Hashing
 * followed by Exact Dual-Gram Truncated SVD (Latent Semantic Analysis).
 *
 * Why this works so well alongside Neural Embeddings:
 * - Zero download latency, works 100% offline.
 * - Jointly embeds corpus documents AND cross-domain lexicon concepts in the exact same
 *   reduced latent semantic space (U_k * Sigma_k via folding-in: v_new = x_new^T * V_k).
 * - Character 4-grams capture technical morphology (e.g., "deterministic" ~ "determinism",
 *   "cybersecurity" ~ "security", "microcontroller" ~ "controller").
 */

import { jacobiSymmetricEigen, normalizeInPlace } from './math.ts';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'over', 'under',
  'your', 'their', 'about', 'which', 'while', 'where', 'when', 'what', 'there',
  'these', 'those', 'have', 'has', 'had', 'are', 'was', 'were', 'been', 'being',
  'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'also',
  'such', 'than', 'then', 'them', 'they', 'our', 'out', 'all', 'any', 'but',
  'not', 'only', 'more', 'most', 'very', 'just', 'like', 'some', 'many', 'much',
  'each', 'other', 'both', 'between', 'through', 'during', 'before', 'after',
  'above', 'below', 'using', 'used', 'uses', 'based', 'across', 'within', 'without',
  'via', 'per', 'new', 'one', 'two', 'three', 'how', 'why', 'who', 'its', 'well',
  'enable', 'enables', 'enabling', 'provide', 'provides', 'providing', 'support',
  'supports', 'supporting', 'system', 'systems', 'solution', 'solutions', 'platform',
]);

/** Lightweight Porter-inspired technical suffix normalizer */
function lightStem(word: string): string {
  if (word.length <= 4) return word;
  if (word.endsWith('ization') && word.length > 9) return word.slice(0, -7) + 'iz';
  if (word.endsWith('ations') && word.length > 8) return word.slice(0, -6);
  if (word.endsWith('ation') && word.length > 7) return word.slice(0, -5);
  if (word.endsWith('ities') && word.length > 7) return word.slice(0, -5) + 'y';
  if (word.endsWith('ments') && word.length > 7) return word.slice(0, -5);
  if (word.endsWith('ment') && word.length > 6) return word.slice(0, -4);
  if (word.endsWith('ness') && word.length > 6) return word.slice(0, -4);
  if (word.endsWith('ing') && word.length > 6) return word.slice(0, -3);
  if (word.endsWith('ies') && word.length > 5) return word.slice(0, -3) + 'y';
  if (word.endsWith('ed') && word.length > 5) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 5) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && word.length > 4) {
    return word.slice(0, -1);
  }
  return word;
}

export function tokenizeTechnical(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[/\\\-_]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ');
  const raw = cleaned.split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return raw;
}

export function extractFeatures(text: string): Map<string, number> {
  const tokens = tokenizeTechnical(text);
  const counts = new Map<string, number>();

  const add = (feat: string, weight: number) => {
    counts.set(feat, (counts.get(feat) ?? 0) + weight);
  };

  const stemmed = tokens.map(lightStem);
  for (let i = 0; i < stemmed.length; i++) {
    const t = stemmed[i];
    add(`w:${t}`, 1.0);
    // Word bigrams capture compound technical concepts (e.g. "zero trust", "digital twin")
    if (i + 1 < stemmed.length) {
      add(`bg:${t}_${stemmed[i + 1]}`, 0.85);
    }
    // Character 4-grams capture morphological overlap across domains
    if (tokens[i].length >= 5) {
      const padded = `<${tokens[i]}>`;
      for (let c = 0; c <= padded.length - 4; c++) {
        add(`c4:${padded.slice(c, c + 4)}`, 0.22);
      }
    }
  }
  return counts;
}

export interface LsaModelResult {
  corpusVectors: Float64Array[];
  lexiconVectors: Float64Array[];
  singularValues: number[];
  dimensions: number;
  embedText: (text: string) => Float64Array;
  extractTopKeywords: (docIndices: number[], topK?: number) => string[];
}

/**
 * Jointly fits a Truncated SVD latent space on the corpus (+ soft lexicon regularization)
 * using the Dual Gram Matrix G = X X^T (exact Jacobi eigendecomposition).
 *
 * Notice: Because N_corpus is typically 15..160 while vocabulary V is ~3000..12000,
 * computing the exact eigen-decomposition of the N x N Gram matrix G = X X^T yields
 * exact left singular vectors U and singular values Sigma = sqrt(lambda) in milliseconds,
 * and V_k = X^T U_k Sigma_k^{-1} allows exact folding-in of arbitrary unseen queries and lexicon concepts!
 */
export function fitLsaSpace(
  corpusTexts: string[],
  lexiconTexts: string[],
  targetDims = 32
): LsaModelResult {
  const nCorpus = corpusTexts.length;
  const corpusFeats = corpusTexts.map(extractFeatures);
  const lexiconFeats = lexiconTexts.map(extractFeatures);

  // Build vocabulary and document frequency over corpus + lexicon (weighted towards corpus)
  const vocabIndex = new Map<string, number>();
  const dfCorpus = new Map<string, number>();
  const dfAll = new Map<string, number>();

  for (const fmap of corpusFeats) {
    for (const feat of fmap.keys()) {
      dfCorpus.set(feat, (dfCorpus.get(feat) ?? 0) + 1);
      dfAll.set(feat, (dfAll.get(feat) ?? 0) + 1);
    }
  }
  for (const fmap of lexiconFeats) {
    for (const feat of fmap.keys()) {
      dfAll.set(feat, (dfAll.get(feat) ?? 0) + 1);
    }
  }

  let vCount = 0;
  for (const [feat, df] of dfAll.entries()) {
    // Keep features appearing at least twice globally, OR any word/bigram in the corpus
    if (df >= 2 || (dfCorpus.get(feat) ?? 0) >= 1) {
      vocabIndex.set(feat, vCount++);
    }
  }

  const totalDocs = nCorpus + lexiconTexts.length * 0.25;
  const idf = new Float64Array(vCount);
  for (const [feat, idx] of vocabIndex.entries()) {
    const dfc = dfCorpus.get(feat) ?? 0;
    const dfa = dfAll.get(feat) ?? 1;
    // Smooth IDF that boosts discriminative technical terms
    const effDf = dfc + (dfa - dfc) * 0.25;
    idf[idx] = Math.log((1 + totalDocs) / (1 + effDf)) + 1.0;
  }

  // Sparse TF-IDF vector representation for speed
  type SparseVec = Array<[number, number]>;
  const toSparseTfIdf = (fmap: Map<string, number>): SparseVec => {
    const entries: SparseVec = [];
    let normSq = 0;
    for (const [feat, tf] of fmap.entries()) {
      const idx = vocabIndex.get(feat);
      if (idx === undefined) continue;
      // Sublinear TF scaling: 1 + log(tf)
      const val = (1 + Math.log(tf)) * idf[idx];
      entries.push([idx, val]);
      normSq += val * val;
    }
    if (normSq > 1e-12) {
      const inv = 1 / Math.sqrt(normSq);
      for (let i = 0; i < entries.length; i++) entries[i][1] *= inv;
    }
    entries.sort((a, b) => a[0] - b[0]);
    return entries;
  };

  const sparseDot = (a: SparseVec, b: SparseVec): number => {
    let i = 0;
    let j = 0;
    let s = 0;
    while (i < a.length && j < b.length) {
      if (a[i][0] === b[j][0]) {
        s += a[i][1] * b[j][1];
        i++;
        j++;
      } else if (a[i][0] < b[j][0]) {
        i++;
      } else {
        j++;
      }
    }
    return s;
  };

  const corpusSparse = corpusFeats.map(toSparseTfIdf);
  const lexiconSparse = lexiconFeats.map(toSparseTfIdf);

  // Build exact N x N Dual Gram Matrix G = X X^T on corpus
  const G = new Float64Array(nCorpus * nCorpus);
  for (let i = 0; i < nCorpus; i++) {
    G[i * nCorpus + i] = sparseDot(corpusSparse[i], corpusSparse[i]);
    for (let j = i + 1; j < nCorpus; j++) {
      const d = sparseDot(corpusSparse[i], corpusSparse[j]);
      G[i * nCorpus + j] = d;
      G[j * nCorpus + i] = d;
    }
  }

  const { eigenvalues, eigenvectors } = jacobiSymmetricEigen(G, nCorpus, 45);

  // Retain top k positive singular components
  const maxK = Math.min(targetDims, nCorpus - 1);
  let k = 0;
  const singularValues: number[] = [];
  for (let i = 0; i < nCorpus; i++) {
    const ev = eigenvalues[i];
    if (ev > 1e-7) {
      singularValues.push(Math.sqrt(ev));
      if (k < maxK) k++;
    }
  }
  k = Math.max(2, Math.min(k, maxK));

  // Corpus coordinates in latent space: Z_i[r] = U_r[i] * sigma_r^(0.85)
  // Mild singular value power (0.85) reduces hubness / anisotropy in cosine space (Caron 2001)
  const corpusVectors: Float64Array[] = [];
  for (let i = 0; i < nCorpus; i++) {
    const vec = new Float64Array(k);
    for (let r = 0; r < k; r++) {
      const sigma = singularValues[r];
      vec[r] = eigenvectors[r][i] * Math.pow(sigma, 0.85);
    }
    corpusVectors.push(normalizeInPlace(vec));
  }

  // Exact folding-in projection: for any new sparse vector q,
  // (q^T V_r) = (1 / sigma_r) * sum_i (q . x_i) * U_r[i]
  // So coordinate r = (q^T V_r) * sigma_r^(0.85) = sigma_r^(-0.15) * sum_i (q . x_i) * U_r[i]
  const foldInSparse = (q: SparseVec): Float64Array => {
    const sims = new Float64Array(nCorpus);
    for (let i = 0; i < nCorpus; i++) {
      sims[i] = sparseDot(q, corpusSparse[i]);
    }
    const vec = new Float64Array(k);
    for (let r = 0; r < k; r++) {
      const u = eigenvectors[r];
      let acc = 0;
      for (let i = 0; i < nCorpus; i++) acc += sims[i] * u[i];
      vec[r] = acc * Math.pow(singularValues[r], -0.15);
    }
    return normalizeInPlace(vec);
  };

  const lexiconVectors = lexiconSparse.map(foldInSparse);

  const embedText = (text: string): Float64Array => {
    const sp = toSparseTfIdf(extractFeatures(text));
    return foldInSparse(sp);
  };

  // Extract representative human-readable keywords for any subset of corpus docs (clusters)
  const extractTopKeywords = (docIndices: number[], topK = 4): string[] => {
    const scores = new Map<string, number>();
    for (const di of docIndices) {
      const fmap = corpusFeats[di];
      if (!fmap) continue;
      for (const [feat, tf] of fmap.entries()) {
        if (!feat.startsWith('w:') && !feat.startsWith('bg:')) continue;
        const idx = vocabIndex.get(feat);
        if (idx === undefined) continue;
        const clean = feat.startsWith('bg:')
          ? feat.slice(3).replace('_', ' ')
          : feat.slice(2);
        if (clean.length < 3) continue;
        const bonus = feat.startsWith('bg:') ? 1.25 : 1.0;
        scores.set(clean, (scores.get(clean) ?? 0) + (1 + Math.log(tf)) * idf[idx] * bonus);
      }
    }
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const picked: string[] = [];
    for (const [term] of sorted) {
      if (picked.length >= topK) break;
      // Avoid redundant substring duplicates
      if (picked.some((p) => p.includes(term) || term.includes(p))) continue;
      picked.push(term);
    }
    return picked;
  };

  return {
    corpusVectors,
    lexiconVectors,
    singularValues,
    dimensions: k,
    embedText,
    extractTopKeywords,
  };
}
