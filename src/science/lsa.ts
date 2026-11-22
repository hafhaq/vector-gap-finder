/**
 * Scientific Local Semantic Embedding Engine & Clause-Aware NLP Phrase Extractor:
 * 1. Unicode NFD diacritic normalization (never splits accented words like "réalité" -> "alit")
 * 2. Clause-respecting contiguous content-word phrase extraction (never glues words across
 *    commas, periods, or removed stopwords!)
 * 3. Comprehensive generic academic/filler filter ("possible", "technology", "reviewed", etc.
 *    can never become cluster names or decoded gap concepts)
 * 4. Multi-word (2-3 word) domain noun-phrase lexicon extraction with PMI / IDF scoring.
 */

import { jacobiSymmetricEigen, normalizeInPlace } from './math.ts';
import type { CorpusItem, LexiconConcept } from '../types.ts';

/** Function words & structural stopwords that break contiguous noun phrases */
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
  'united', 'states', 'american', 'english', 'british', 'january', 'february', 'march',
  'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'upon', 'onto', 'among', 'towards', 'toward', 'against', 'around', 'whether', 'either',
]);

/**
 * Generic academic, metadata, and filler words that must NEVER surface as cluster labels
 * or decoded gap concepts (eliminates "Possible × Technology", "Reviewed Spatial", etc.).
 */
const GENERIC_SLOP_WORDS = new Set([
  'possible', 'impossible', 'possibility', 'technology', 'technologies', 'technological',
  'available', 'availability', 'different', 'difference', 'differences', 'various', 'variety',
  'important', 'importance', 'significant', 'significantly', 'effective', 'effectively',
  'potential', 'potentially', 'proposed', 'propose', 'proposes', 'present', 'presents',
  'presented', 'presenting', 'approach', 'approaches', 'method', 'methods', 'methodology',
  'application', 'applications', 'applied', 'useful', 'novel', 'newly',
  'paper', 'papers', 'article', 'articles', 'review', 'reviewed', 'reviews', 'peer',
  'journal', 'conference', 'proceedings', 'international', 'national', 'research', 'researcher',
  'researchers', 'study', 'studies', 'studied', 'results', 'result', 'resulting', 'effect',
  'effects', 'analysis', 'analyses', 'evaluation', 'evaluated', 'overview', 'survey',
  'multiple', 'single', 'general', 'specific', 'specifically', 'common', 'commonly',
  'typical', 'basic', 'provide', 'provided', 'provides', 'providing', 'include', 'includes',
  'allow', 'allows', 'allowing', 'enable', 'enables', 'enabling', 'support', 'supports',
  'supporting', 'show', 'shows', 'shown', 'demonstrate', 'demonstrates', 'demonstrated',
  'investigate', 'investigates', 'investigated', 'explore', 'explores', 'explored', 'discuss',
  'discussed', 'address', 'addressed', 'aspect', 'aspects', 'factor', 'factors', 'type', 'types',
  'form', 'forms', 'kind', 'kinds', 'way', 'ways', 'manner', 'order', 'point', 'points',
  'number', 'total', 'group', 'groups', 'set', 'sets', 'example', 'examples', 'case', 'cases',
  'need', 'needs', 'required', 'requirement', 'requirements', 'related', 'relation',
  'relationship', 'associated', 'compared', 'comparison', 'similar', 'particular',
  'particularly', 'especially', 'main', 'major', 'key', 'primary', 'overall', 'complete',
  'full', 'discussion', 'points', 'comments', 'recent', 'covering', 'wikipedia', 'stars',
  'starring', 'directed', 'released', 'written', 'produced', 'featuring', 'learn', 'source',
  'repository', 'page', 'list', 'films', 'movie', 'movies', 'series', 'received', 'founded',
  'publication', 'object', 'played', 'premiered', 'nominated', 'appeared', 'appears',
  'following', 'several', 'film', 'book', 'books', 'author', 'authors', 'chapter', 'volume',
  'press', 'university', 'edition', 'post', 'posts', 'thread', 'question', 'answer',
  'file', 'files', 'folder', 'github', 'readme', 'license', 'install',
  'div', 'class', 'section', 'abstract', 'span', 'jats', 'xml', 'html', 'http', 'https', 'www',
  'numerous', 'advantage', 'advantages', 'disadvantage', 'disadvantages', 'benefit', 'benefits',
  'limitation', 'limitations', 'century', 'invention', 'inventions', 'actress', 'actor',
  'actors', 'campaign', 'campaigns', 'advert', 'advertisement', 'company', 'companies', 'agency',
  'state', 'good', 'great', 'now', 'right', 'left', 'high', 'low', 'large', 'small',
  'upcoming', 'highly', 'fully', 'widely', 'mostly', 'nearly', 'almost', 'real', 'environment',
]);

/**
 * Commodity horizontal buzzwords & decade-old umbrella terms that are NEVER an "untapped 2026 discovery"
 * on their own (prevents "Artificial Intelligence × Voice Controlled" or "Machine Learning × Smart Home").
 */
const COMMODITY_UMBRELLA_PHRASES = new Set([
  'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'neural networks',
  'internet of things', 'cloud computing', 'mobile application', 'mobile applications', 'web application',
  'voice controlled', 'voice control', 'home automation', 'smart home', 'smart homes', 'heating systems',
  'heating system', 'air conditioning', 'big data', 'data analytics', 'data science', 'computer science',
  'computer vision', 'social media', 'digital transformation', 'industry 4 0', 'control system',
  'control systems', 'system automation', 'automation system', 'automation systems', 'automated system',
  'automated systems', 'control theory', 'feedback control', 'process control', 'industrial automation',
  'literature review', 'systematic review', 'case study', 'experimental results', 'simulation results',
  'future work', 'future research', 'proposed method', 'proposed system', 'existing systems',
]);
const TRAILING_ADJECTIVES = new Set([
  'high', 'low', 'higher', 'lower', 'theoretical', 'experimental', 'practical', 'commercial',
  'industrial', 'conventional', 'traditional', 'modern', 'advanced', 'dynamic', 'static',
  'virtual', 'augmented', 'spatial', 'digital', 'physical', 'chemical', 'mechanical',
  'electrical', 'electronic', 'optical', 'thermal', 'magnetic', 'structural', 'functional',
  'operational', 'real', 'fast', 'slow', 'large', 'small', 'short', 'long', 'good', 'great',
  'new', 'old', 'full', 'empty', 'open', 'closed', 'free', 'public', 'private', 'social',
  'cultural', 'political', 'economic', 'global', 'local', 'internal', 'external', 'primary',
  'secondary', 'initial', 'final', 'active', 'passive', 'direct', 'indirect', 'hybrid',
  'solid', 'liquid', 'autonomous', 'automated', 'interactive', 'immersive', 'collaborative',
  'distributed', 'decentralized', 'federated', 'hierarchical', 'modular', 'scalable', 'robust',
  'flexible', 'efficient', 'accurate', 'precise', 'deterministic', 'stochastic', 'adaptive',
  'predictive', 'generative', 'cognitive', 'neural', 'symbolic', 'semantic', 'topological',
  'conductive', 'resistive', 'capacitive', 'inductive', 'upcoming', 'semiotic', 'peircean',
  'controlled', 'automated', 'connected', 'powered', 'driven', 'enabled', 'assisted', 'guided',
]);

function normalizeAscii(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

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

/**
 * Splits text into contiguous runs of content words strictly respecting punctuation
 * and stopword boundaries — never gluing words across sentence breaks or stripped stopwords!
 */
export function extractContiguousRuns(text: string): string[][] {
  const ascii = normalizeAscii(text)
    .toLowerCase()
    // Keep common technical hyphenated prefixes attached to their head word
    .replace(/\b(solid|multi|single|non|self|zero|cross|real|open|closed|high|low|all|semi|three|two|co)-(?=[a-z])/g, '$1 ');
  // Split on any clause/phrase punctuation first
  const clauses = ascii.split(/[.,;:!?()[\]{}"'`/\\|<>—–+\-*=~_]+/);
  const runs: string[][] = [];

  for (const clause of clauses) {
    const rawWords = clause.trim().split(/\s+/);
    let currentRun: string[] = [];
    for (const w of rawWords) {
      const clean = w.replace(/[^a-z0-9]/g, '');
      if (
        clean.length < 3 ||
        /^\d+$/.test(clean) ||
        STOP_WORDS.has(clean)
      ) {
        if (currentRun.length > 0) {
          runs.push(currentRun);
          currentRun = [];
        }
      } else {
        currentRun.push(clean);
      }
    }
    if (currentRun.length > 0) runs.push(currentRun);
  }
  return runs;
}

/** Trim generic wrapper words ("films", "systems", "techniques", "methods", etc.) from the edges of a candidate run */
function trimGenericEdges(words: string[]): string[] {
  let start = 0;
  let end = words.length;
  while (start < end && GENERIC_SLOP_WORDS.has(words[start])) start++;
  while (end > start && (GENERIC_SLOP_WORDS.has(words[end - 1]) || TRAILING_ADJECTIVES.has(words[end - 1]))) {
    end--;
  }
  return words.slice(start, end);
}

export function tokenizeTechnical(text: string): string[] {
  const runs = extractContiguousRuns(text);
  const out: string[] = [];
  for (const run of runs) {
    for (const w of run) out.push(w);
  }
  return out;
}

function titleCase(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Returns true if a phrase is informative (not composed solely of generic slop words) */
function isHighSignalPhrase(words: string[]): boolean {
  if (words.length === 0) return false;
  const lastWord = words[words.length - 1];
  // A valid noun phrase must never end on a bare dangling adjective (blocks "High Theoretical", "Spatial Augmented")
  if (TRAILING_ADJECTIVES.has(lastWord) || GENERIC_SLOP_WORDS.has(lastWord)) return false;

  const specificCount = words.filter((w) => !GENERIC_SLOP_WORDS.has(w)).length;
  if (words.length === 1) {
    return specificCount === 1 && words[0].length >= 5;
  }
  if (GENERIC_SLOP_WORDS.has(words[0])) return false;
  return specificCount >= Math.ceil(words.length * 0.65);
}

export function extractFeatures(
  text: string,
  surfaceCounts?: Map<string, Map<string, number>>
): Map<string, number> {
  const runs = extractContiguousRuns(text);
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

  for (const run of runs) {
    const stemmed = run.map(lightStem);
    for (let i = 0; i < stemmed.length; i++) {
      const t = stemmed[i];
      const w = run[i];
      // Keep full TF-IDF geometric representation, but only register high-signal words as displayable surfaces
      add(`w:${t}`, 1.0, isHighSignalPhrase([w]) ? w : undefined);

      // Only form bigrams from genuinely adjacent words inside the SAME contiguous run!
      if (i + 1 < stemmed.length && w !== run[i + 1]) {
        const pair = [w, run[i + 1]];
        const highSig = isHighSignalPhrase(pair);
        add(
          `bg:${t}_${stemmed[i + 1]}`,
          0.85,
          highSig ? `${w} ${run[i + 1]}` : undefined
        );
      }

      if (w.length >= 5) {
        const padded = `<${w}>`;
        for (let c = 0; c <= padded.length - 4; c++) {
          add(`c4:${padded.slice(c, c + 4)}`, 0.22);
        }
      }
    }
  }
  return counts;
}

/**
 * Extracts a high-signal, 100% domain-native multi-word concept vocabulary directly
 * from the active corpus (curated multi-word tags + contiguous 2-3 word noun phrases).
 * Never emits vague 1-word filler or cross-punctuation gibberish!
 */
export function buildDomainNativeLexicon(items: CorpusItem[], maxConcepts = 65): LexiconConcept[] {
  const n = items.length;
  if (n === 0) return [];

  // Identify ubiquitous query-echo tokens AND their morphological stems (appearing in > 36% of corpus docs)
  const tokenDocFreq = new Map<string, number>();
  const stemDocFreq = new Map<string, number>();
  for (const item of items) {
    const uniq = new Set(tokenizeTechnical(`${item.title} ${item.summary}`));
    const uniqStems = new Set<string>();
    for (const tok of uniq) {
      tokenDocFreq.set(tok, (tokenDocFreq.get(tok) ?? 0) + 1);
      uniqStems.add(lightStem(tok));
    }
    for (const st of uniqStems) {
      stemDocFreq.set(st, (stemDocFreq.get(st) ?? 0) + 1);
    }
  }
  const ubiquitousStems = new Set<string>();
  const hyperUbiquitousStems = new Set<string>();
  const echoThreshold = Math.max(4, Math.floor(n * 0.36));
  const hyperThreshold = Math.max(5, Math.floor(n * 0.54));
  for (const [st, df] of stemDocFreq.entries()) {
    if (df >= echoThreshold) ubiquitousStems.add(st);
    if (df >= hyperThreshold) hyperUbiquitousStems.add(st);
  }

  const phraseDocs = new Map<string, Set<number>>();
  const phraseContext = new Map<string, string[]>();
  const phraseOrigin = new Map<string, string>();

  const recordPhrase = (words: string[], docIdx: number, origin: string, titleSample: string) => {
    if (words.length < 2 || words.length > 3) return; // Strictly require 2-3 word specific phrases!
    if (!isHighSignalPhrase(words)) return;
    // Reject duplicate consecutive words
    if (words[0] === words[1] || (words[2] && words[1] === words[2])) return;

    const key = words.join(' ');
    if (key.length < 8 || key.length > 46) return;
    if (COMMODITY_UMBRELLA_PHRASES.has(key)) return;

    const stems = words.map(lightStem);
    if (stems.some((st) => hyperUbiquitousStems.has(st) && st.length >= 5 && n <= 35)) return;
    if (stems.filter((st) => ubiquitousStems.has(st)).length >= 2) return;

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

  items.forEach((item, idx) => {
    // 1. Curated multi-word tags from OpenAlex, Wikipedia, Crossref, GitHub, StackExchange
    for (const tag of item.tags ?? []) {
      if (
        /(\b\d{4}s?\b|establishments|disestablishments|initial public offerings|living people|births|deaths|alumni|people from|companies based in|articles|wikipedia|wikidata)/i.test(
          tag
        )
      ) {
        continue;
      }
      const runs = extractContiguousRuns(tag);
      for (const rawRun of runs) {
        const run = trimGenericEdges(rawRun);
        if (run.length >= 2 && run.length <= 3) {
          recordPhrase(run, idx, 'Domain Tag', item.title);
        }
      }
    }

    // 2. Title phrases get a dedicated origin ("Title Concept") so distinctive 2-3 word title themes are captured even at df=1
    const titleRuns = extractContiguousRuns(item.title);
    for (const rawRun of titleRuns) {
      const run = trimGenericEdges(rawRun);
      for (let i = 0; i < run.length; i++) {
        if (i + 1 < run.length) {
          recordPhrase([run[i], run[i + 1]], idx, 'Title Concept', item.title);
        }
        if (i + 2 < run.length) {
          recordPhrase([run[i], run[i + 1], run[i + 2]], idx, 'Title Concept', item.title);
        }
      }
    }

    // 3. Contiguous 2-word and 3-word technical/domain phrases from summary
    const runs = extractContiguousRuns(item.summary);
    for (const rawRun of runs) {
      const run = trimGenericEdges(rawRun);
      for (let i = 0; i < run.length; i++) {
        if (i + 1 < run.length) {
          recordPhrase([run[i], run[i + 1]], idx, 'Corpus Concept', item.title);
        }
        if (i + 2 < run.length) {
          recordPhrase([run[i], run[i + 1], run[i + 2]], idx, 'Corpus Concept', item.title);
        }
      }
    }
  });

  const maxAllowedDf = Math.max(2, Math.floor(n * 0.45));
  const candidates: Array<{ key: string; score: number; df: number; origin: string; titles: string[] }> = [];

  for (const [key, docSet] of phraseDocs.entries()) {
    const df = docSet.size;
    if (df > maxAllowedDf) continue;
    const origin = phraseOrigin.get(key)!;
    const isCuratedOrTitle = origin === 'Domain Tag' || origin === 'Title Concept';
    // Body-only phrases require df >= 2; verified tags & title concepts are eligible at df >= 1
    if (!isCuratedOrTitle && df < 2 && n >= 14) continue;

    const words = key.split(' ');
    let pmiSum = 0;
    for (const w of words) {
      const wDf = tokenDocFreq.get(w) ?? df;
      pmiSum += Math.log((n * df) / Math.max(1, wDf * df) + 1);
    }
    const pmiBoost = 1 + pmiSum / words.length;
    const idf = Math.log((1 + n) / (1 + df));
    const multiDocBoost = df >= 2 ? 1.45 : 1.0;
    const tagBonus = isCuratedOrTitle ? 1.4 : words.length === 3 ? 1.25 : 1.1;
    const score = idf * Math.log(1.6 + df) * tagBonus * multiDocBoost * pmiBoost;
    candidates.push({ key, score, df, origin, titles: phraseContext.get(key) ?? [] });
  }

  candidates.sort((a, b) => b.score - a.score);

  const concepts: LexiconConcept[] = [];
  for (const c of candidates) {
    if (concepts.length >= maxConcepts) break;
    // Deduplicate overlapping phrases (avoid keeping both "projection mapping" and "dynamic projection mapping" if too close)
    const cWords = new Set(c.key.split(' '));
    const overlapsExisting = concepts.some((k) => {
      const kLower = k.term.toLowerCase();
      if (kLower === c.key || kLower.includes(c.key) || c.key.includes(kLower)) return true;
      const kWords = kLower.split(' ');
      const shared = kWords.filter((w) => cWords.has(w) && !ubiquitousStems.has(lightStem(w))).length;
      return shared >= 2;
    });
    if (overlapsExisting) continue;

    const label = titleCase(c.key);
    const examples = c.titles.slice(0, 2).join('; ');
    concepts.push({
      term: label,
      domain: c.origin,
      description: `Domain capability/theme present in ${c.df}/${n} corpus items (e.g. "${examples}")`,
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
    if (topWord) bestSurface.set(feat, topWord);
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

  const foldInSparse = (
    q: SparseVec,
    fmap: Map<string, number>,
    dampOutOfSubspace = true
  ): Float64Array => {
    // Count how many distinct non-generic word stems in q actually exist in the corpus
    let sharedSpecificWords = 0;
    if (dampOutOfSubspace) {
      for (const [feat, w] of fmap.entries()) {
        if (feat.startsWith('w:') && w >= 0.9 && (dfCorpus.get(feat) ?? 0) >= 1) {
          sharedSpecificWords++;
        }
      }
    }

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

    // Require at least 2 shared specific domain words across >= 2 corpus docs (or strong TF-IDF match >= 0.16)
    // before admitting an out-of-sample static lexicon vector at unit norm!
    let docsMatching = 0;
    for (let i = 0; i < nCorpus; i++) {
      if (sims[i] >= 0.08) docsMatching++;
    }
    if (dampOutOfSubspace && (sharedSpecificWords < 2 || docsMatching < 2 || maxDocSim < 0.13)) {
      const scale =
        sharedSpecificWords < 2 || docsMatching < 2
          ? 0
          : Math.max(0, (maxDocSim - 0.06) / 0.08) / rawNorm;
      for (let r = 0; r < k; r++) vec[r] *= scale;
      return vec;
    }
    return normalizeInPlace(vec);
  };

  const lexiconVectors = lexiconSparse.map((sp, idx) =>
    foldInSparse(sp, lexiconFeats[idx], true)
  );

  const embedText = (text: string): Float64Array => {
    const fm = extractFeatures(text);
    const sp = toSparseTfIdf(fm);
    return foldInSparse(sp, fm, false);
  };

  // Extract clean, high-signal unstemmed cluster keywords (strongly preferring contiguous bigrams!)
  const extractTopKeywords = (docIndices: number[], topK = 5): string[] => {
    const scores = new Map<string, number>();
    const maxDfEcho = Math.max(3, Math.floor(nCorpus * 0.28));

    for (const di of docIndices) {
      const fmap = corpusFeats[di];
      if (!fmap) continue;
      for (const [feat, tf] of fmap.entries()) {
        if (!feat.startsWith('w:') && !feat.startsWith('bg:')) continue;
        if ((dfCorpus.get(feat) ?? 0) > maxDfEcho) continue;
        // For bigrams, also reject if BOTH component word stems exceed 34% corpus frequency (blocks "System Automation")
        if (feat.startsWith('bg:')) {
          const parts = feat.slice(3).split('_');
          if (
            (dfCorpus.get(`w:${parts[0]}`) ?? 0) > nCorpus * 0.34 &&
            (dfCorpus.get(`w:${parts[1]}`) ?? 0) > nCorpus * 0.34
          ) {
            continue;
          }
        }
        const idx = vocabIndex.get(feat);
        if (idx === undefined) continue;
        const surface = bestSurface.get(feat);
        if (!surface || surface.length < 4 || COMMODITY_UMBRELLA_PHRASES.has(surface)) continue;
        // Prefer contiguous 2-word domain phrases for crisp cluster names
        const bonus = feat.startsWith('bg:') ? 1.9 : 0.8;
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
