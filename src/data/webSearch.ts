/**
 * 100% Client-Side CORS-Enabled Multi-Aggregator Web Harvesters (18 Verified Open Sources!)
 * Every single source below has been empirically verified for browser CORS access with ZERO backend:
 *
 * SCIENCE, RESEARCH & REGULATORY:
 *  1. openalex       — OpenAlex (250M+ papers, patents, preprints)
 *  2. crossref       — Crossref (150M+ peer-reviewed DOIs: IEEE, ACM, Springer, Nature)
 *  3. datacite       — DataCite (global research datasets, software DOIs, tech reports)
 *  4. pubmed         — PubMed / NCBI (37M+ biomedical & life-science abstracts)
 *  5. clinicaltrials — ClinicalTrials.gov (global clinical trials & medical interventions)
 *  6. federalreg     — US Federal Register (FDA/FCC/DOE/EPA/OSHA regulatory filings & rules)
 *
 * KNOWLEDGE GRAPHS, BOOKS & GLOBAL ARCHIVES:
 *  7. wikipedia      — Wikipedia (canonical concepts, categories, spell-check)
 *  8. wikidata       — Wikidata (structured entities, companies, standards, products)
 *  9. wikinews       — Wikinews (open global news coverage)
 * 10. openlibrary    — Open Library (published books, textbooks & handbooks)
 * 11. archiveorg     — Internet Archive (whitepapers, manuals, reports, broadcasts)
 *
 * COMMUNITIES, Q&A & MEDIA ECOSYSTEMS:
 * 12. hackernews     — Hacker News Algolia (practitioner discussions & launches)
 * 13. lemmy          — Lemmy Fediverse (broad Reddit-style community discussions)
 * 14. stackexchange  — Stack Overflow / Exchange (engineering & developer Q&A)
 * 15. itunes         — Apple iTunes / Podcasts & Media (podcasts, films, audiobooks)
 *
 * SOFTWARE, PACKAGES & AI MODELS:
 * 16. github         — GitHub Repositories (active open-source tools, stars >= 5)
 * 17. npm            — npm Registry (JS/TS/web packages & tooling)
 * 18. huggingface    — Hugging Face Hub (open-weight AI/ML models & checkpoints)
 */

import type { CorpusItem } from '../types.ts';

export type WebSourceId =
  | 'openalex'
  | 'crossref'
  | 'datacite'
  | 'pubmed'
  | 'clinicaltrials'
  | 'federalreg'
  | 'wikipedia'
  | 'wikidata'
  | 'wikinews'
  | 'openlibrary'
  | 'archiveorg'
  | 'hackernews'
  | 'lemmy'
  | 'stackexchange'
  | 'itunes'
  | 'github'
  | 'npm'
  | 'huggingface';

export interface SourceMeta {
  id: WebSourceId;
  name: string;
  desc: string;
  group: 'Science & Policy' | 'Knowledge & Archives' | 'Communities & Media' | 'Software & AI';
  defaultEnabled: boolean;
}

export const ALL_WEB_SOURCES: SourceMeta[] = [
  // Science & Policy
  { id: 'openalex', name: 'OpenAlex Research', desc: '250M+ engineering & scientific papers', group: 'Science & Policy', defaultEnabled: true },
  { id: 'crossref', name: 'Crossref DOIs', desc: '150M+ IEEE, ACM, Springer & journal works', group: 'Science & Policy', defaultEnabled: true },
  { id: 'datacite', name: 'DataCite Datasets', desc: 'Open research datasets & technical reports', group: 'Science & Policy', defaultEnabled: false },
  { id: 'pubmed', name: 'PubMed / NCBI', desc: '37M+ biomedical & life-science studies', group: 'Science & Policy', defaultEnabled: false },
  { id: 'clinicaltrials', name: 'ClinicalTrials.gov', desc: 'Global medical device & biotech trials', group: 'Science & Policy', defaultEnabled: false },
  { id: 'federalreg', name: 'US Federal Register', desc: 'Live FDA, DOE, FCC & regulatory filings', group: 'Science & Policy', defaultEnabled: false },

  // Knowledge & Archives
  { id: 'wikipedia', name: 'Wikipedia Concepts', desc: 'Canonical architectures, films & topics', group: 'Knowledge & Archives', defaultEnabled: true },
  { id: 'wikidata', name: 'Wikidata Entities', desc: 'Structured companies, products & standards', group: 'Knowledge & Archives', defaultEnabled: true },
  { id: 'openlibrary', name: 'Open Library Books', desc: 'Published books, textbooks & field guides', group: 'Knowledge & Archives', defaultEnabled: true },
  { id: 'archiveorg', name: 'Internet Archive', desc: 'Manuals, whitepapers, reports & media', group: 'Knowledge & Archives', defaultEnabled: false },
  { id: 'wikinews', name: 'Wikinews', desc: 'Open collaborative news reporting', group: 'Knowledge & Archives', defaultEnabled: false },

  // Communities & Media
  { id: 'hackernews', name: 'Hacker News', desc: 'Practitioner pain points & product launches', group: 'Communities & Media', defaultEnabled: true },
  { id: 'lemmy', name: 'Lemmy Communities', desc: 'Federated Reddit-style topic discussions', group: 'Communities & Media', defaultEnabled: false },
  { id: 'itunes', name: 'Podcasts & Media', desc: 'Apple Podcasts, films & creator ecosystems', group: 'Communities & Media', defaultEnabled: true },
  { id: 'stackexchange', name: 'Stack Exchange Q&A', desc: 'Technical Q&A & implementation bottlenecks', group: 'Communities & Media', defaultEnabled: true },

  // Software & AI
  { id: 'github', name: 'GitHub Repos', desc: 'Active open-source tools (5+ stars)', group: 'Software & AI', defaultEnabled: true },
  { id: 'npm', name: 'npm Packages', desc: 'JavaScript/TypeScript developer ecosystem', group: 'Software & AI', defaultEnabled: false },
  { id: 'huggingface', name: 'Hugging Face Hub', desc: 'Open-weight AI, vision & robotics models', group: 'Software & AI', defaultEnabled: false },
];

export const DEFAULT_SOURCES: WebSourceId[] = ALL_WEB_SOURCES
  .filter((s) => s.defaultEnabled)
  .map((s) => s.id);

export const SOURCE_PACKS: Record<string, { label: string; sources: WebSourceId[] }> = {
  broad: {
    label: 'Broad Sweep (10)',
    sources: DEFAULT_SOURCES,
  },
  tech: {
    label: 'Deep Tech & Eng (11)',
    sources: ['openalex', 'crossref', 'datacite', 'wikipedia', 'wikidata', 'openlibrary', 'hackernews', 'stackexchange', 'github', 'npm', 'huggingface'],
  },
  biotech: {
    label: 'Bio & Regulatory (8)',
    sources: ['openalex', 'crossref', 'pubmed', 'clinicaltrials', 'federalreg', 'datacite', 'wikipedia', 'openlibrary'],
  },
  culture: {
    label: 'Culture & Market (8)',
    sources: ['wikipedia', 'wikidata', 'wikinews', 'itunes', 'openlibrary', 'archiveorg', 'lemmy', 'openalex'],
  },
  all: {
    label: 'All 18 Sources (Max)',
    sources: ALL_WEB_SOURCES.map((s) => s.id),
  },
};

export interface HarvestProgress {
  source: WebSourceId;
  fetched: number;
  status: 'fetching' | 'done' | 'error';
  message?: string;
}

export interface HarvestResult {
  items: CorpusItem[];
  resolvedQuery: string;
  wasCorrected: boolean;
  sourceCounts: Record<string, number>;
}

const QUERY_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'in', 'of', 'on', 'to', 'a', 'an', 'by', 'at', 'as',
  'from', 'vs', 'versus', 'best', 'top', 'new', 'latest', 'today', 'trends',
]);

function significantQueryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !QUERY_STOPWORDS.has(w) && !/^20\d{2}$/.test(w));
}

const NON_ENGLISH_MARKERS =
  /\b(dans|pour|avec|cette|sont|une|les|des|mais|comme|elle|tout|aussi|deux|faire|etre|avoir|solide|como|para|uma|pelos|sobre|muito|tambem|pelo|pela|foram|esta|este|nicht|durch|oder|einer|einem|einen|sowie|werden|wurde|wird|sind|auch|nach|uber|unter|sistem|tata|yang|dengan|untuk|dari|pada|dalam)\b/gi;

const ENGLISH_MARKERS =
  /\b(the|and|for|with|that|this|from|into|are|was|were|have|has|using|based|through|between|which|while|where|when|can|will|their|more|than|over|under|such|these|those|of|in|to|on|by|at|as|is|be)\b/gi;

/** Strict English check: requires real English function words AND no foreign stopword clusters */
function isLikelyEnglish(text: string): boolean {
  const clean = text.slice(0, 700);
  const nonEn = (clean.match(NON_ENGLISH_MARKERS) ?? []).length;
  const en = (clean.match(ENGLISH_MARKERS) ?? []).length;
  if (en < 3) return false;
  if (nonEn >= 3 && nonEn >= en * 0.25) return false;
  return true;
}

/** Decode HTML entities FIRST, then strip all XML/HTML/JATS tags, URLs, and citation brackets */
function cleanSummaryText(raw: string): string {
  const decoded = decodeHtmlEntities(decodeHtmlEntities(raw));
  return decoded
    .replace(/<jats:title[^>]*>[\s\S]*?<\/jats:title>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\b(div\s+class|section\s+abstract|jats:\w+)\b/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\[\d+(?:,\s*\d+)*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a candidate document genuinely relates to the query.
 * When requireTitleMatch is true (for broad noisy archives like Archive.org, OpenLibrary, iTunes, Lemmy),
 * at least one core query token must appear in the TITLE itself (preventing 2-hour radio/TV transcripts
 * that mention a term once in passing from entering the corpus).
 */
function isRelevantToQuery(title: string, summary: string, query: string, requireTitleMatch = false): boolean {
  if (!isLikelyEnglish(`${title}. ${summary}`)) return false;
  const normTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const hay = `${normTitle} ${summary
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()}`;
  const tokens = significantQueryTokens(query);
  if (tokens.length === 0) return true;

  if (requireTitleMatch) {
    let titleHits = 0;
    for (const tok of tokens) {
      const re = new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      if (re.test(normTitle)) titleHits++;
    }
    const minTitleHits = tokens.length <= 2 ? tokens.length : Math.max(2, Math.ceil(tokens.length * 0.6));
    if (titleHits < minTitleHits) return false;
  }

  const normalizedPhrase = tokens.join(' ');
  if (hay.includes(normalizedPhrase)) return true;

  let matched = 0;
  for (const tok of tokens) {
    const re = new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (re.test(hay)) matched++;
  }
  if (tokens.length <= 2) return matched === tokens.length;
  return matched >= Math.max(2, Math.ceil(tokens.length * 0.7));
}

function fetchWithTimeout(url: string, init?: RequestInit, ms = 7500): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
}

async function resolveQuerySpelling(rawQuery: string): Promise<{ resolved: string; corrected: boolean }> {
  const clean = rawQuery.trim();
  const noYear = clean.replace(/\b20\d{2}\b/g, '').trim() || clean;
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(noYear)}&srlimit=3&format=json&origin=*`;
    const res = await fetchWithTimeout(url, undefined, 4500);
    if (!res.ok) return { resolved: clean, corrected: false };
    const data = await res.json();
    const suggestion: string | undefined = data?.query?.searchinfo?.suggestion;
    if (suggestion && suggestion.toLowerCase() !== noYear.toLowerCase()) {
      return { resolved: suggestion, corrected: true };
    }
  } catch {
    // Ignore spellcheck failure
  }
  return { resolved: clean, corrected: false };
}

function reconstructOpenAlexAbstract(inverted?: Record<string, number[]>): string {
  if (!inverted) return '';
  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) words.push([pos, word]);
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map((w) => w[1]).join(' ').slice(0, 480);
}

// 1. OpenAlex (requires real abstract + English)
async function fetchOpenAlex(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit + 12}&sort=relevance_score:desc&filter=from_publication_date:2019-01-01,language:en`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const work of data.results ?? []) {
    const title = cleanSummaryText(work.display_name ?? '');
    if (!title || title.length < 10) continue;
    const abstract = cleanSummaryText(reconstructOpenAlexAbstract(work.abstract_inverted_index));
    if (abstract.length < 75) continue;
    const textLower = `${title} ${abstract}`.toLowerCase();
    const concepts = (work.concepts ?? [])
      .filter((c: { level?: number; score?: number; display_name?: string }) => {
        if ((c.level ?? 2) < 2) return false;
        const name = (c.display_name ?? '').toLowerCase();
        // Verify the concept's words actually appear in the paper (prevents OpenAlex
        // word-sense collisions like tagging "projection mapping" with "Relational algebra"!)
        const words = name.split(/\s+/).filter((w) => w.length >= 4);
        return words.length > 0 && words.every((w) => textLower.includes(w));
      })
      .slice(0, 5)
      .map((c: { display_name: string }) => c.display_name)
      .filter((c: string) => c && c.split(/\s+/).length >= 2);
    if (!isRelevantToQuery(title, `${abstract} ${concepts.join(' ')}`, query)) continue;
    items.push({
      id: `oa-${work.id?.split('/').pop() ?? Math.random().toString(36).slice(2, 8)}`,
      title,
      summary: abstract.slice(0, 480),
      category: concepts[0] ?? 'Research Paper',
      source: 'OpenAlex',
      url: work.doi || work.id,
      year: work.publication_year,
      tags: concepts,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 2. Crossref (requires has-abstract:true + English)
async function fetchCrossref(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&filter=has-abstract:true&rows=${limit + 10}&sort=relevance&order=desc`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Crossref HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const work of data?.message?.items ?? []) {
    const title = cleanSummaryText(Array.isArray(work.title) ? work.title[0] : work.title ?? '');
    if (!title || title.length < 10) continue;
    const rawAbs = cleanSummaryText(String(work.abstract ?? ''));
    if (rawAbs.length < 75) continue;
    const subjects: string[] = (Array.isArray(work.subject) ? work.subject : [])
      .map((s: string) => s.replace(/\s*\(.*?\)/g, '').trim())
      .filter((s: string) => s.split(/\s+/).length >= 2)
      .slice(0, 4);
    const year = work.published?.['date-parts']?.[0]?.[0];
    if (!isRelevantToQuery(title, `${rawAbs} ${subjects.join(' ')}`, query)) continue;
    items.push({
      id: `cr-${work.DOI ? work.DOI.replace(/[^a-z0-9]/gi, '').slice(0, 14) : Math.random().toString(36).slice(2, 9)}`,
      title,
      summary: rawAbs.slice(0, 480),
      category: subjects[0] ?? 'Peer-Reviewed',
      source: 'Crossref',
      url: work.URL || (work.DOI ? `https://doi.org/${work.DOI}` : undefined),
      year,
      tags: subjects,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 3. DataCite (requires real description >= 70 chars)
async function fetchDataCite(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://api.datacite.org/dois?query=${encodeURIComponent(query)}&page[size]=${limit + 8}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`DataCite HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const rec of data.data ?? []) {
    const attr = rec.attributes ?? {};
    const title = cleanSummaryText(attr.titles?.[0]?.title ?? '');
    if (!title || title.length < 10) continue;
    const desc = cleanSummaryText(String(attr.descriptions?.[0]?.description ?? ''));
    if (desc.length < 70) continue;
    const subjects: string[] = (attr.subjects ?? [])
      .map((s: { subject?: string }) => (s.subject ?? '').trim())
      .filter((s: string) => s.split(/\s+/).length >= 2)
      .slice(0, 4);
    if (!isRelevantToQuery(title, `${desc} ${subjects.join(' ')}`, query)) continue;
    items.push({
      id: `dc-${rec.id}`,
      title,
      summary: desc.slice(0, 460),
      category: subjects[0] || 'Dataset',
      source: 'DataCite',
      url: attr.url || `https://doi.org/${rec.id}`,
      year: attr.publicationYear,
      tags: subjects,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 4. PubMed / NCBI (fetches full XML abstracts via efetch)
async function fetchPubMed(query: string, limit: number): Promise<CorpusItem[]> {
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${limit + 4}&sort=relevance`;
  const sRes = await fetchWithTimeout(searchUrl);
  if (!sRes.ok) throw new Error(`PubMed HTTP ${sRes.status}`);
  const sData = await sRes.json();
  const ids: string[] = sData?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
  const fRes = await fetchWithTimeout(fetchUrl);
  if (!fRes.ok) throw new Error(`PubMed efetch HTTP ${fRes.status}`);
  const xml = await fRes.text();

  const items: CorpusItem[] = [];
  const articles = xml.split(/<PubmedArticle>/i).slice(1);
  for (const art of articles) {
    const pmid = art.match(/<PMID[^>]*>(\d+)<\/PMID>/i)?.[1] ?? Math.random().toString(36).slice(2, 8);
    const rawTitle = art.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/i)?.[1] ?? '';
    const title = cleanSummaryText(decodeHtmlEntities(rawTitle)).replace(/\.$/, '');
    if (!title || title.length < 10) continue;

    const absParts = Array.from(art.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)).map((m) => m[1]);
    const abstract = cleanSummaryText(decodeHtmlEntities(absParts.join(' ')));
    if (abstract.length < 75) continue;

    const yearStr = art.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/i)?.[1];
    const mesh = Array.from(art.matchAll(/<DescriptorName[^>]*>([\s\S]*?)<\/DescriptorName>/gi))
      .map((m) => decodeHtmlEntities(m[1]).trim())
      .filter((m) => m.split(/\s+/).length >= 2)
      .slice(0, 4);

    if (!isRelevantToQuery(title, `${abstract} ${mesh.join(' ')}`, query)) continue;
    items.push({
      id: `pm-${pmid}`,
      title,
      summary: abstract.slice(0, 480),
      category: mesh[0] ?? 'PubMed',
      source: 'PubMed',
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      year: yearStr ? Number(yearStr) : undefined,
      tags: mesh,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 5. ClinicalTrials.gov
async function fetchClinicalTrials(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&pageSize=${limit + 4}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`ClinicalTrials HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const st of data.studies ?? []) {
    const ps = st.protocolSection ?? {};
    const idMod = ps.identificationModule ?? {};
    const descMod = ps.descriptionModule ?? {};
    const conds: string[] = ps.conditionsModule?.conditions ?? [];
    const title = (idMod.briefTitle || idMod.officialTitle || '').trim();
    if (!title) continue;
    const summary = (descMod.briefSummary || `Clinical study investigating ${conds.join(', ') || query}.`).replace(/\s+/g, ' ').trim().slice(0, 440);
    if (!isRelevantToQuery(title, `${summary} ${conds.join(' ')}`, query)) continue;
    items.push({
      id: `ct-${idMod.nctId ?? Math.random().toString(36).slice(2, 8)}`,
      title,
      summary,
      category: conds[0] ?? 'Clinical Trial',
      source: 'ClinicalTrials.gov',
      url: idMod.nctId ? `https://clinicaltrials.gov/study/${idMod.nctId}` : undefined,
      tags: conds.slice(0, 4),
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 6. US Federal Register (Regulatory Filings & Rules)
async function fetchFederalRegister(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://www.federalregister.gov/api/v1/documents.json?conditions[term]=${encodeURIComponent(query)}&per_page=${limit + 4}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`FederalRegister HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const doc of data.results ?? []) {
    const title = (doc.title ?? '').trim();
    if (!title) continue;
    const agencies: string[] = (doc.agencies ?? []).map((a: { name?: string }) => a.name ?? '').filter(Boolean);
    const abs = (doc.abstract || `${doc.type || 'Regulatory notice'} by ${agencies.join(', ')} regarding ${title}.`).trim();
    if (!isRelevantToQuery(title, `${abs} ${agencies.join(' ')}`, query)) continue;
    items.push({
      id: `fr-${doc.document_number ?? Math.random().toString(36).slice(2, 8)}`,
      title,
      summary: abs.slice(0, 440),
      category: agencies[0] ?? 'Regulatory Filing',
      source: 'Federal Register',
      url: doc.html_url,
      year: doc.publication_date ? Number(String(doc.publication_date).slice(0, 4)) : undefined,
      tags: agencies.slice(0, 3),
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 7. Wikipedia (Phrase-Anchored + Clean Categories)
async function fetchWikipedia(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const tokens = significantQueryTokens(cleanQuery);
  const fetchLimit = Math.max(limit, 20);

  let hits: Array<{ pageid: number; title: string; snippet: string }> = [];
  if (tokens.length >= 2 && tokens.length <= 4) {
    const phraseUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`"${cleanQuery}"`)}&srlimit=${fetchLimit}&format=json&origin=*`;
    const pRes = await fetchWithTimeout(phraseUrl);
    if (pRes.ok) {
      const pData = await pRes.json();
      hits = pData?.query?.search ?? [];
    }
  }

  if (hits.length < 10) {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&srlimit=${fetchLimit}&format=json&origin=*`;
    const searchRes = await fetchWithTimeout(searchUrl);
    if (!searchRes.ok) throw new Error(`Wikipedia HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const extra: Array<{ pageid: number; title: string; snippet: string }> = searchData?.query?.search ?? [];
    const seenIds = new Set(hits.map((h) => h.pageid));
    for (const e of extra) {
      if (!seenIds.has(e.pageid)) {
        const snip = e.snippet.replace(/<[^>]+>/g, ' ');
        if (isRelevantToQuery(e.title, snip, cleanQuery)) {
          hits.push(e);
          seenIds.add(e.pageid);
        }
      }
    }
  }

  if (hits.length === 0) return [];
  const capped = hits.slice(0, fetchLimit);

  const pageIds = capped.map((h) => h.pageid).join('|');
  const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|categories&exintro=1&explaintext=1&exchars=440&clshow=!hidden&cllimit=6&pageids=${pageIds}&format=json&origin=*`;
  const extRes = await fetchWithTimeout(extractUrl);
  const extData = extRes.ok ? await extRes.json() : null;
  const pages = extData?.query?.pages ?? {};

  return capped.map((h) => {
    const page = pages[h.pageid];
    const extract: string = page?.extract || h.snippet.replace(/<[^>]+>/g, '');
    const cats: string[] = (page?.categories ?? [])
      .map((c: { title: string }) => c.title.replace(/^Category:/i, '').trim())
      .filter(
        (c: string) =>
          c.length > 2 &&
          !/^(articles|all |cs1|webarchive|use |short description|wikipedia|pages |commons |wikidata)/i.test(c) &&
          !/(\b\d{4}s?\b|establishments|disestablishments|initial public offerings|living people|births|deaths|alumni|people from|companies based in|headquartered in|redirects)/i.test(c)
      )
      .slice(0, 4);

    return {
      id: `wiki-${h.pageid}`,
      title: h.title,
      summary: extract.trim().slice(0, 460),
      category: cats[0] ?? 'Wikipedia',
      source: 'Wikipedia',
      url: `https://en.wikipedia.org/?curid=${h.pageid}`,
      tags: cats,
    };
  });
}

// 8. Wikidata Structured Entities
async function fetchWikidata(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(cleanQuery)}&language=en&limit=${limit + 4}&format=json&origin=*`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const ent of data.search ?? []) {
    const label = (ent.label ?? '').trim();
    const desc = (ent.description ?? '').trim();
    if (!label || desc.length < 8) continue;
    if (/wikimedia disambiguation|wikimedia category/i.test(desc)) continue;
    if (!isRelevantToQuery(label, desc, cleanQuery)) continue;
    items.push({
      id: `wd-${ent.id}`,
      title: label,
      summary: `${label}: ${desc}.`,
      category: 'Knowledge Entity',
      source: 'Wikidata',
      url: ent.concepturi || `https://www.wikidata.org/wiki/${ent.id}`,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 9. Wikinews
async function fetchWikinews(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&srlimit=${limit + 4}&format=json&origin=*`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Wikinews HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const h of data?.query?.search ?? []) {
    const snip = String(h.snippet ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!isRelevantToQuery(h.title, snip, cleanQuery)) continue;
    items.push({
      id: `wn-${h.pageid}`,
      title: h.title,
      summary: snip || h.title,
      category: 'News Report',
      source: 'Wikinews',
      url: `https://en.wikinews.org/?curid=${h.pageid}`,
      year: h.timestamp ? Number(String(h.timestamp).slice(0, 4)) : undefined,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 10. Open Library Books (requires real subject/sentence content)
async function fetchOpenLibrary(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQuery)}&limit=${limit + 8}&fields=key,title,subtitle,first_publish_year,subject,first_sentence`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`OpenLibrary HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const doc of data.docs ?? []) {
    const rawTitle = (doc.title ?? '').trim();
    const sub = (doc.subtitle ?? '').trim();
    const title = sub && !rawTitle.includes(sub) ? `${rawTitle}: ${sub}` : rawTitle;
    if (!title || title.length < 8) continue;
    const subjects: string[] = (Array.isArray(doc.subject) ? doc.subject : [])
      .map((s: string) => s.trim())
      .filter((s: string) => s.split(/\s+/).length >= 2 && s.length <= 42 && !/^(accessible book|protected daisy|in library|overdrive|large type)/i.test(s))
      .slice(0, 6);
    const firstSentence = Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : doc.first_sentence || '';
    const summary = cleanSummaryText(`${firstSentence} ${subjects.join('. ')}`);
    if (summary.length < 45) continue;
    if (!isRelevantToQuery(title, summary, cleanQuery, true)) continue;
    items.push({
      id: `ol-${String(doc.key ?? Math.random()).replace(/\W+/g, '')}`,
      title,
      summary: summary.slice(0, 440),
      category: subjects[0] ?? 'Book',
      source: 'Open Library',
      url: doc.key ? `https://openlibrary.org${doc.key}` : undefined,
      year: doc.first_publish_year,
      tags: subjects.slice(0, 4),
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 11. Internet Archive Aggregator (title-anchored texts only, excluding TV/radio crawl dumps)
async function fetchArchiveOrg(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const qExpr = `title:(${cleanQuery}) AND mediatype:(texts)`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(qExpr)}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=year&fl[]=subject&rows=${limit + 10}&output=json`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Archive.org HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const doc of data?.response?.docs ?? []) {
    const title = cleanSummaryText(Array.isArray(doc.title) ? doc.title[0] : doc.title ?? '');
    if (!title || title.length < 8 || /^github\.com-|wayback|transcript/i.test(title)) continue;
    const rawDesc = Array.isArray(doc.description) ? doc.description.join(' ') : doc.description ?? '';
    const desc = cleanSummaryText(String(rawDesc));
    if (desc.length < 65) continue;
    const subs: string[] = (Array.isArray(doc.subject) ? doc.subject : doc.subject ? [String(doc.subject)] : [])
      .map((s: string) => s.trim())
      .filter((s: string) => s.split(/\s+/).length >= 2 && s.length <= 42)
      .slice(0, 4);
    if (!isRelevantToQuery(title, `${desc} ${subs.join(' ')}`, cleanQuery, true)) continue;
    items.push({
      id: `ia-${doc.identifier}`,
      title,
      summary: desc.slice(0, 460),
      category: subs[0] ?? 'Archive',
      source: 'Internet Archive',
      url: `https://archive.org/details/${doc.identifier}`,
      year: doc.year ? Number(doc.year) || undefined : undefined,
      tags: subs,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 12. Hacker News Algolia
async function fetchHackerNews(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const tokens = significantQueryTokens(cleanQuery);
  const qParam = tokens.length >= 2 && tokens.length <= 3 ? `"${cleanQuery}"` : cleanQuery;
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(qParam)}&tags=story&hitsPerPage=${limit + 6}&advancedSyntax=true&typoTolerance=false`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HN Algolia HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const hit of data.hits ?? []) {
    const title = (hit.title ?? '').trim();
    if (!title) continue;
    const text = (hit.story_text ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!isRelevantToQuery(title, text, cleanQuery)) continue;
    const year = hit.created_at ? Number(hit.created_at.slice(0, 4)) : undefined;
    items.push({
      id: `hn-${hit.objectID}`,
      title,
      summary: text.length > 30 ? text.slice(0, 420) : `Practitioner thread (${hit.points ?? 0} pts, ${hit.num_comments ?? 0} comments): ${title}.`,
      category: 'Community Thread',
      source: 'Hacker News',
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      year,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 13. Lemmy Fediverse Community Aggregator (requires substantive post body)
async function fetchLemmy(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://lemmy.world/api/v3/search?q=${encodeURIComponent(cleanQuery)}&type_=Posts&sort=TopAll&limit=${limit + 10}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Lemmy HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const entry of data.posts ?? []) {
    const post = entry.post ?? {};
    const comm = entry.community?.title || entry.community?.name || 'Community';
    const title = cleanSummaryText(post.name ?? '');
    if (!title || title.length < 10) continue;
    const body = cleanSummaryText(String(post.body ?? '').replace(/[#*_`>\[\]()]/g, ' '));
    const combined = body.length >= 45 ? body : `${title}. ${body}`.trim();
    if (combined.length < 45) continue;
    if (!isRelevantToQuery(title, `${combined} ${comm}`, cleanQuery, true)) continue;
    items.push({
      id: `lm-${post.id}`,
      title,
      summary: combined.slice(0, 440),
      category: comm,
      source: 'Lemmy',
      url: post.ap_id || post.url,
      year: post.published ? Number(String(post.published).slice(0, 4)) : undefined,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 14. Stack Exchange / Stack Overflow Q&A
async function fetchStackExchange(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://api.stackexchange.com/2.3/search/excerpts?order=desc&sort=relevance&q=${encodeURIComponent(cleanQuery)}&pagesize=${limit + 6}&site=stackoverflow`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`StackExchange HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const q of data.items ?? []) {
    if (q.item_type !== 'question') continue;
    const title = cleanSummaryText(decodeHtmlEntities(String(q.title ?? '')));
    const excerpt = cleanSummaryText(decodeHtmlEntities(String(q.excerpt ?? '')));
    const tags: string[] = (q.tags ?? []).filter((t: string) => t.length >= 3);
    if (!title || excerpt.length < 55 || !isRelevantToQuery(title, `${excerpt} ${tags.join(' ')}`, cleanQuery, true)) continue;
    items.push({
      id: `se-${q.question_id}`,
      title,
      summary: excerpt.slice(0, 440),
      category: tags[0] ?? 'Q&A',
      source: 'Stack Exchange',
      url: `https://stackoverflow.com/questions/${q.question_id}`,
      tags: tags.slice(0, 4),
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 15. Apple iTunes Podcasts & Media Ecosystem (requires real episode/item description >= 60 chars)
async function fetchItunes(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&limit=${limit + 12}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const r of data.results ?? []) {
    const title = cleanSummaryText(r.trackName || r.collectionName || '');
    if (!title || title.length < 6) continue;
    const genre = (r.primaryGenreName || '').trim();
    const rawDesc = cleanSummaryText(String(r.longDescription || r.description || r.shortDescription || ''));
    if (rawDesc.length < 55) continue;
    if (!isRelevantToQuery(`${title} ${r.artistName ?? ''}`, `${rawDesc} ${genre}`, cleanQuery, true)) continue;
    items.push({
      id: `it-${r.trackId || r.collectionId || Math.random().toString(36).slice(2, 8)}`,
      title: r.artistName && !title.toLowerCase().includes(r.artistName.toLowerCase()) ? `${title} (${r.artistName})` : title,
      summary: rawDesc.slice(0, 460),
      category: genre || 'Media',
      source: 'Podcasts & Media',
      url: r.trackViewUrl || r.collectionViewUrl,
      year: r.releaseDate ? Number(String(r.releaseDate).slice(0, 4)) : undefined,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 16. GitHub Repositories (stars >= 5)
async function fetchGitHub(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(cleanQuery + ' stars:>=5')}&sort=stars&order=desc&per_page=${limit + 4}`;
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const repo of data.items ?? []) {
    if ((repo.stargazers_count ?? 0) < 5) continue;
    const desc = (repo.description ?? '').trim();
    const topics: string[] = repo.topics ?? [];
    if (!desc && topics.length === 0) continue;
    const summary = `${desc}${topics.length ? ` — Topics: ${topics.slice(0, 6).join(', ')}` : ''}`;
    if (!isRelevantToQuery(repo.full_name, `${desc} ${topics.join(' ')}`, cleanQuery)) continue;
    items.push({
      id: `gh-${repo.id}`,
      title: repo.full_name,
      summary,
      category: topics[0] || 'Open Source',
      source: 'GitHub',
      url: repo.html_url,
      year: repo.updated_at ? Number(repo.updated_at.slice(0, 4)) : undefined,
      tags: topics.slice(0, 6),
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 17. npm Registry
async function fetchNpm(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(cleanQuery)}&size=${limit + 4}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`npm HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const obj of data.objects ?? []) {
    const pkg = obj.package ?? {};
    const name = (pkg.name ?? '').trim();
    const desc = (pkg.description ?? '').trim();
    const kw: string[] = pkg.keywords ?? [];
    if (!name || !desc) continue;
    if (!isRelevantToQuery(name, `${desc} ${kw.join(' ')}`, cleanQuery)) continue;
    items.push({
      id: `npm-${name}`,
      title: name,
      summary: `${desc}${kw.length ? ` — Keywords: ${kw.slice(0, 5).join(', ')}` : ''}`,
      category: kw[0] || 'npm Package',
      source: 'npm',
      url: pkg.links?.npm || `https://www.npmjs.com/package/${name}`,
      tags: kw.slice(0, 5),
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 18. Hugging Face Hub Models
async function fetchHuggingFace(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://huggingface.co/api/models?search=${encodeURIComponent(cleanQuery)}&sort=downloads&direction=-1&limit=${limit + 4}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HuggingFace HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const m of Array.isArray(data) ? data : []) {
    const id = (m.id || m.modelId || '').trim();
    if (!id) continue;
    const tags: string[] = (m.tags ?? []).filter((t: string) => !t.includes(':') && t.length > 2).slice(0, 6);
    const task = m.pipeline_tag || tags[0] || 'ML Model';
    const summary = `Open AI model (${task}, ${m.downloads ?? 0} downloads) — Tags: ${tags.join(', ') || id}.`;
    if (!isRelevantToQuery(id, `${summary} ${tags.join(' ')}`, cleanQuery)) continue;
    items.push({
      id: `hf-${id.replace(/\W+/g, '-')}`,
      title: id,
      summary,
      category: task,
      source: 'Hugging Face',
      url: `https://huggingface.co/${id}`,
      tags: [task, ...tags].slice(0, 5),
    });
    if (items.length >= limit) break;
  }
  return items;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, ' - ')
    .replace(/&hellip;/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&[a-z0-9#]{2,10};/gi, ' ');
}

export async function harvestWebCorpus(
  rawQuery: string,
  sources: WebSourceId[],
  perSourceLimit = 14,
  onProgress?: (p: HarvestProgress) => void
): Promise<HarvestResult> {
  const { resolved: query, corrected: wasCorrected } = await resolveQuerySpelling(rawQuery);

  const fetchers: Record<WebSourceId, () => Promise<CorpusItem[]>> = {
    openalex: () => fetchOpenAlex(query, perSourceLimit),
    crossref: () => fetchCrossref(query, perSourceLimit),
    datacite: () => fetchDataCite(query, perSourceLimit),
    pubmed: () => fetchPubMed(query, perSourceLimit),
    clinicaltrials: () => fetchClinicalTrials(query, perSourceLimit),
    federalreg: () => fetchFederalRegister(query, perSourceLimit),
    wikipedia: () => fetchWikipedia(query, perSourceLimit),
    wikidata: () => fetchWikidata(query, perSourceLimit),
    wikinews: () => fetchWikinews(query, perSourceLimit),
    openlibrary: () => fetchOpenLibrary(query, perSourceLimit),
    archiveorg: () => fetchArchiveOrg(query, perSourceLimit),
    hackernews: () => fetchHackerNews(query, perSourceLimit),
    lemmy: () => fetchLemmy(query, perSourceLimit),
    stackexchange: () => fetchStackExchange(query, perSourceLimit),
    itunes: () => fetchItunes(query, perSourceLimit),
    github: () => fetchGitHub(query, perSourceLimit),
    npm: () => fetchNpm(query, perSourceLimit),
    huggingface: () => fetchHuggingFace(query, perSourceLimit),
  };

  const results = await Promise.all(
    sources.map(async (src) => {
      onProgress?.({ source: src, fetched: 0, status: 'fetching' });
      try {
        const docs = await fetchers[src]();
        onProgress?.({ source: src, fetched: docs.length, status: 'done' });
        return { src, docs };
      } catch (err) {
        onProgress?.({
          source: src,
          fetched: 0,
          status: 'error',
          message: err instanceof Error ? err.message : 'Network error',
        });
        return { src, docs: [] as CorpusItem[] };
      }
    })
  );

  // Interleave round-robin across sources before capping so every active aggregator
  // contributes evenly to the dense manifold rather than one source hogging all slots!
  const seen = new Set<string>();
  const merged: CorpusItem[] = [];
  const sourceCounts: Record<string, number> = {};
  const maxLen = Math.max(0, ...results.map((r) => r.docs.length));

  for (let idx = 0; idx < maxLen; idx++) {
    for (const { docs } of results) {
      const item = docs[idx];
      if (!item) continue;
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      const sLabel = item.source ?? 'Web';
      sourceCounts[sLabel] = (sourceCounts[sLabel] ?? 0) + 1;
    }
  }

  return { items: merged, resolvedQuery: query, wasCorrected, sourceCounts };
}
