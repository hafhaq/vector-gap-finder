/**
 * Scientific Local Semantic Embedding Engine:
 * Sublinear TF-IDF + Bigrams + Character 4-Gram Morphological Hashing
 * followed by Exact Dual-Gram Truncated SVD (Latent Semantic Analysis).
 *
 * Also tracks canonical human-readable surface forms (never exposing ugly stemmed stems!)
 * and extracts a clean, domain-native concept lexicon directly from ANY corpus so
 * gap decoding works accurately on ANY topic (engineering, cinema, medicine, finance, etc.).
 */

import { jacobiSymmetricEigen, normalizeInPlace } from './math.ts';
import type { CorpusItem, LexiconConcept } from '../types.ts';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'over', 'under',
  'your', 'their', 'about', 'which', 'while', 'where', 'when', 'what', 'there',
  'these', 'those', 'have', 'has', 'had', 'are', 'was', 'were', 'been', 'being',
  'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'also',
  'such', 'than', 'then', 'them', 'they', 'our', 'out', 'all', 'any', 'but',
  'not', 'only', 'more', 'most', 'very', 'just', 'like', 'some', 'many', 'much',
  'each', 'other', 'both', 'between', 'through', 'during', 'before', 'after',
  'above', 'below', 'using', 'used', 'uses', 'based', 'across', 'within', 'without',
  'via', 'per', 'new', 'one', 'two', 'three', 'four', 'five', 'how', 'why', 'who',
  'whom', 'whose', 'its', 'well', 'his', 'her', 'hers', 'she', 'him', 'himself',
  'herself', 'itself', 'they', 'we', 'you', 'did', 'does', 'doing', 'done', 'made',
  'make', 'making', 'became', 'become', 'known', 'born', 'held', 'later', 'since',
  'first', 'second', 'third', 'last', 'next', 'early', 'late', 'same', 'own', 'even',
  'still', 'however', 'although', 'because', 'including', 'included', 'called', 'named',
  'part', 'time', 'year', 'years', 'day', 'days', 'month', 'world', 'people', 'work',
  'enable', 'enables', 'enabling', 'provide', 'provides', 'providing', 'support',
  'supports', 'supporting', 'system', 'systems', 'solution', 'solutions', 'platform',
  'united', 'states', 'american', 'english', 'british', 'january', 'february', 'march',
  'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'discussion', 'points', 'comments', 'recent', 'covering', 'wikipedia', 'article',
  'stars', 'starring', 'directed', 'released', 'written', 'produced', 'featuring',
  'based', 'study', 'analysis', 'case', 'role', 'what', 'learn', 'part', 'source',
  'repository', 'open', 'page', 'list', 'films', 'movie', 'movies', 'series',
  'received', 'founded', 'publication', 'research', 'object', 'context', 'played',
  'premiered', 'nominated', 'appeared', 'appears', 'following', 'several', 'various',
  'reviews', 'around', 'general', 'different', 'related', 'between', 'through', 'film',
]);

/** Lightweight Porter-inspired technical suffix normalizer (internal matching ONLY!) */
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
  return cleaned
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

function titleCase(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

export function extractFeatures(
  text: string,
  surfaceCounts?: Map<string, Map<string, number>>
): Map<string, number> {
  const tokens = tokenizeTechnical(text);
  const counts = new Map<string, number>();

  const add = (feat: string, weight: number, surface?: string) => {
    counts.set(feat, (counts.get(feat) ?? 0) + weight);
    if (surface && surfaceCounts) {
      let inner = surfaceCounts.get(feat);
      if (!inner) {
        inner = new Map<string, number>();
        surfaceCounts.set(feat, inner);
      }
      inner.set(surface, (inner.get(surface) ?? 0) + 1);
    }
  };

  const stemmed = tokens.map(lightStem);
  for (let i = 0; i < stemmed.length; i++) {
    const t = stemmed[i];
    add(`w:${t}`, 1.0, tokens[i]);
    if (i + 1 < stemmed.length && tokens[i] !== tokens[i + 1]) {
      add(`bg:${t}_${stemmed[i + 1]}`, 0.85, `${tokens[i]} ${tokens[i + 1]}`);
    }
    if (tokens[i].length >= 5) {
      const padded = `<${tokens[i]}>`;
      for (let c = 0; c <= padded.length - 4; c++) {
        add(`c4:${padded.slice(c, c + 4)}`, 0.22);
      }
    }
  }
  return counts;
}

/**
 * Automatically builds a clean, 100% domain-native concept vocabulary directly from
 * any corpus (tags, categories, salient unstemmed bigrams & terms).
 * Ensures VoidLens speaks the exact language of ANY topic (cinema, bio, PLCs, etc.)!
 */
export function buildDomainNativeLexicon(items: CorpusItem[], maxConcepts = 65): LexiconConcept[] {
  const n = items.length;
  if (n === 0) return [];

  // Identify ubiquitous query-echo unigrams (appearing in > 42% of corpus docs)
  // so phrases like "Stars Sydney" never get surfaced as "missing" concepts!
  const tokenDocFreq = new Map<string, number>();
  for (const item of items) {
    const uniq = new Set(tokenizeTechnical(`${item.title} ${item.summary}`));
    for (const tok of uniq) tokenDocFreq.set(tok, (tokenDocFreq.get(tok) ?? 0) + 1);
  }
  const ubiquitousTokens = new Set<string>();
  const echoThreshold = Math.max(4, Math.floor(n * 0.42));
  for (const [tok, df] of tokenDocFreq.entries()) {
    if (df >= echoThreshold) ubiquitousTokens.add(tok);
  }

  const phraseDocs = new Map<string, Set<number>>();
  const phraseContext = new Map<string, string[]>();
  const phraseOrigin = new Map<string, string>();

  const recordPhrase = (raw: string, docIdx: number, origin: string, titleSample: string) => {
    const clean = raw
      .replace(/\(.*?\)/g, ' ')
      .replace(/[^a-zA-Z0-9\s\-&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean.length < 4 || clean.length > 48) return;
    const words = clean.toLowerCase().split(/\s+/);
    if (words.every((w) => STOP_WORDS.has(w) || /^\d+$/.test(w))) return;
    // Reject phrases containing ubiquitous query-echo tokens (e.g. "sydney", "sweeney")
    if (words.some((w) => ubiquitousTokens.has(w))) return;
    const key = clean.toLowerCase();
    let set = phraseDocs.get(key);
    if (!set) {
      set = new Set<number>();
      phraseDocs.set(key, set);
      phraseOrigin.set(key, origin);
      phraseContext.set(key, []);
    }
    set.add(docIdx);
    const ctx = phraseContext.get(key)!;
    if (ctx.length < 3 && !ctx.includes(titleSample)) ctx.push(titleSample);
  };

  // 1. Harvest explicit categories & Wikipedia/OpenAlex/GitHub tags first (highest quality!)
  items.forEach((item, idx) => {
    if (
      item.category &&
      !/^(wikipedia|industry discussion|research paper|open source|custom corpus|encyclopedia concept|knowledge entity|peer-reviewed|community thread|news report|archive|book|dataset|clinical trial|regulatory filing|npm package|ml model|q&a|media)$/i.test(
        item.category
      )
    ) {
      recordPhrase(item.category, idx, 'Domain Theme', item.title);
    }
    for (const tag of item.tags ?? []) {
      // Skip chronological/administrative categories (e.g. "1977 establishments in Pennsylvania")
      if (/(\b\d{4}s?\b|establishments|disestablishments|initial public offerings|living people|births|deaths|alumni|people from|companies based in)/i.test(tag)) {
        continue;
      }
      recordPhrase(tag, idx, 'Domain Tag', item.title);
    }

    // 2. Extract clean unstemmed bigrams and salient terms from title + summary
    const tokens = tokenizeTechnical(`${item.title}. ${item.summary}`);
    for (let i = 0; i < tokens.length; i++) {
      if (i + 1 < tokens.length && tokens[i] !== tokens[i + 1]) {
        const bg = `${tokens[i]} ${tokens[i + 1]}`;
        recordPhrase(bg, idx, 'Corpus Concept', item.title);
      }
      if (tokens[i].length >= 5) {
        recordPhrase(tokens[i], idx, 'Corpus Theme', item.title);
      }
    }
  });

  // Score phrases: prefer phrases appearing in 2..(55% of corpus) docs — informative themes,
  // NOT ubiquitous query echoes (like "sydney sweeney" appearing in 90% of docs!)
  const maxAllowedDf = Math.max(2, Math.floor(n * 0.55));
  const candidates: Array<{ key: string; score: number; df: number; origin: string; titles: string[] }> = [];

  for (const [key, docSet] of phraseDocs.entries()) {
    const df = docSet.size;
    if (df > maxAllowedDf) continue;
    const origin = phraseOrigin.get(key)!;
    const isTag = origin === 'Domain Tag' || origin === 'Domain Theme';
    if (!isTag && df < 2 && n >= 10) continue;

    const wordCount = key.split(/\s+/).length;
    const idf = Math.log((1 + n) / (1 + df));
    // Prefer specific multi-word themes & curated tags over generic single words
    const tagBonus = isTag
      ? wordCount >= 2
        ? 1.95
        : 1.25
      : wordCount >= 2
        ? 1.5
        : 0.72;
    const score = idf * Math.log(1.5 + df) * tagBonus;
    candidates.push({ key, score, df, origin, titles: phraseContext.get(key) ?? [] });
  }

  candidates.sort((a, b) => b.score - a.score);

  const concepts: LexiconConcept[] = [];
  for (const c of candidates) {
    if (concepts.length >= maxConcepts) break;
    // Deduplicate near-identical substrings
    if (
      concepts.some(
        (k) =>
          k.term.toLowerCase() === c.key ||
          (c.key.length > 5 && k.term.toLowerCase().includes(c.key)) ||
          (k.term.length > 5 && c.key.includes(k.term.toLowerCase()))
      )
    ) {
      continue;
    }
    const label = titleCase(c.key);
    const examples = c.titles.slice(0, 2).join(', ');
    concepts.push({
      term: label,
      domain: c.origin,
      description: `Emergent corpus theme (${c.df}/${n} items, e.g. ${examples})`,
    });
  }

  return concepts;
}

export interface LsaModelResult {
  corpusVectors: Float64Array[];
  lexiconVectors: Float64Array[];
  singularValues: number[];
  dimensions: number;
  embedText: (text: string) => Float64Array;
  extractTopKeywords: (docIndices: number[], topK?: number) => string[];
}

export function fitLsaSpace(
  corpusTexts: string[],
  lexiconTexts: string[],
  targetDims = 32
): LsaModelResult {
  const nCorpus = corpusTexts.length;
  const surfaceCounts = new Map<string, Map<string, number>>();
  const corpusFeats = corpusTexts.map((t) => extractFeatures(t, surfaceCounts));
  const lexiconFeats = lexiconTexts.map((t) => extractFeatures(t));

  // Resolve canonical human-readable surface form for every feature key
  const bestSurface = new Map<string, string>();
  for (const [feat, counts] of surfaceCounts.entries()) {
    let topWord = '';
    let topCnt = -1;
    for (const [surf, cnt] of counts.entries()) {
      if (cnt > topCnt) {
        topCnt = cnt;
        topWord = surf;
      }
    }
    bestSurface.set(feat, topWord);
  }

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
    if (df >= 2 || (dfCorpus.get(feat) ?? 0) >= 1) {
      vocabIndex.set(feat, vCount++);
    }
  }

  const totalDocs = nCorpus + lexiconTexts.length * 0.25;
  const idf = new Float64Array(vCount);
  for (const [feat, idx] of vocabIndex.entries()) {
    const dfc = dfCorpus.get(feat) ?? 0;
    const dfa = dfAll.get(feat) ?? 1;
    const effDf = dfc + (dfa - dfc) * 0.25;
    idf[idx] = Math.log((1 + totalDocs) / (1 + effDf)) + 1.0;
  }

  type SparseVec = Array<[number, number]>;
  const toSparseTfIdf = (fmap: Map<string, number>): SparseVec => {
    const entries: SparseVec = [];
    let normSq = 0;
    for (const [feat, tf] of fmap.entries()) {
      const idx = vocabIndex.get(feat);
      if (idx === undefined) continue;
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

  const G = new Float64Array(nCorpus * nCorpus);
  for (let i = 0; i < nCorpus; i++) {
    G[i * nCorpus + i] = sparseDot(corpusSparse[i], corpusSparse[i]);
    for (let j = i + 1; j < nCorpus; j++) {
      const d = sparseDot(corpusSparse[i], corpusSparse[j]);
      G[i * nCorpus + j] = d;
      G[j * nCorpus + i] = d;
    }
  }

  const { eigenvalues, eigenvectors } = jacobiSymmetricEigen(G, nCorpus, nCorpus > 110 ? 22 : 45);

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

  const corpusVectors: Float64Array[] = [];
  for (let i = 0; i < nCorpus; i++) {
    const vec = new Float64Array(k);
    for (let r = 0; r < k; r++) {
      const sigma = singularValues[r];
      vec[r] = eigenvectors[r][i] * Math.pow(sigma, 0.85);
    }
    corpusVectors.push(normalizeInPlace(vec));
  }

  const foldInSparse = (q: SparseVec, dampOutOfSubspace = true): Float64Array => {
    const sims = new Float64Array(nCorpus);
    let maxDocSim = 0;
    for (let i = 0; i < nCorpus; i++) {
      const s = sparseDot(q, corpusSparse[i]);
      sims[i] = s;
      if (s > maxDocSim) maxDocSim = s;
    }
    const vec = new Float64Array(k);
    let normSq = 0;
    for (let r = 0; r < k; r++) {
      const u = eigenvectors[r];
      let acc = 0;
      for (let i = 0; i < nCorpus; i++) acc += sims[i] * u[i];
      const val = acc * Math.pow(singularValues[r], -0.15);
      vec[r] = val;
      normSq += val * val;
    }
    const rawNorm = Math.sqrt(normSq);
    if (rawNorm < 1e-10) return vec;

    // Crucial linear-algebra safeguard: do NOT blow up tiny out-of-subspace noise
    // (e.g., an industrial PLC term folded into a cinema corpus sharing 1 stray char 4-gram)
    // to unit length! Smoothly attenuate vectors whose actual corpus overlap is near zero.
    if (dampOutOfSubspace && maxDocSim < 0.09) {
      const scale = Math.max(0, (maxDocSim - 0.02) / 0.07) / rawNorm;
      for (let r = 0; r < k; r++) vec[r] *= scale;
      return vec;
    }
    return normalizeInPlace(vec);
  };

  const lexiconVectors = lexiconSparse.map((sp) => foldInSparse(sp, true));

  const embedText = (text: string): Float64Array => {
    const sp = toSparseTfIdf(extractFeatures(text));
    return foldInSparse(sp, false);
  };

  // Extract clean, UNSTEMMED human-readable keywords for clusters (penalizing global query echo!)
  const extractTopKeywords = (docIndices: number[], topK = 4): string[] => {
    const scores = new Map<string, number>();
    const maxDfEcho = Math.max(3, Math.floor(nCorpus * 0.65));

    for (const di of docIndices) {
      const fmap = corpusFeats[di];
      if (!fmap) continue;
      for (const [feat, tf] of fmap.entries()) {
        if (!feat.startsWith('w:') && !feat.startsWith('bg:')) continue;
        // Skip ubiquitous terms appearing across almost the entire corpus (e.g., query echo)
        if ((dfCorpus.get(feat) ?? 0) > maxDfEcho) continue;
        const idx = vocabIndex.get(feat);
        if (idx === undefined) continue;
        const surface = bestSurface.get(feat);
        if (!surface || surface.length < 3) continue;
        const bonus = feat.startsWith('bg:') ? 1.3 : 1.0;
        scores.set(surface, (scores.get(surface) ?? 0) + (1 + Math.log(tf)) * idf[idx] * bonus);
      }
    }
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const picked: string[] = [];
    for (const [term] of sorted) {
      if (picked.length >= topK) break;
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
