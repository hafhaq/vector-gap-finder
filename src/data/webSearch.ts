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
  { id: 'archiveorg', name: 'Internet Archive', desc: 'Manuals, whitepapers, reports & media', group: 'Knowledge & Archives', defaultEnabled: true },
  { id: 'wikinews', name: 'Wikinews', desc: 'Open collaborative news reporting', group: 'Knowledge & Archives', defaultEnabled: false },

  // Communities & Media
  { id: 'hackernews', name: 'Hacker News', desc: 'Practitioner pain points & product launches', group: 'Communities & Media', defaultEnabled: true },
  { id: 'lemmy', name: 'Lemmy Communities', desc: 'Federated Reddit-style topic discussions', group: 'Communities & Media', defaultEnabled: true },
  { id: 'itunes', name: 'Podcasts & Media', desc: 'Apple Podcasts, films & creator ecosystems', group: 'Communities & Media', defaultEnabled: true },
  { id: 'stackexchange', name: 'Stack Exchange Q&A', desc: 'Technical Q&A & implementation bottlenecks', group: 'Communities & Media', defaultEnabled: false },

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

function isRelevantToQuery(title: string, summary: string, query: string): boolean {
  const hay = `${title} ${summary}`.toLowerCase();
  const tokens = significantQueryTokens(query);
  if (tokens.length === 0) return true;
  const normalizedPhrase = tokens.join(' ');
  if (hay.includes(normalizedPhrase)) return true;

  let matched = 0;
  for (const tok of tokens) {
    const re = new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (re.test(hay)) matched++;
  }
  if (tokens.length <= 2) return matched === tokens.length;
  return matched >= Math.max(2, Math.ceil(tokens.length * 0.55));
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

// 1. OpenAlex
async function fetchOpenAlex(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit + 6}&sort=relevance_score:desc&filter=from_publication_date:2022-01-01,language:en`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const work of data.results ?? []) {
    const title = (work.display_name ?? '').trim();
    if (!title) continue;
    const abstract = reconstructOpenAlexAbstract(work.abstract_inverted_index);
    const concepts = (work.concepts ?? []).slice(0, 5).map((c: { display_name: string }) => c.display_name);
    const summary =
      abstract.length > 40
        ? abstract
        : `Research publication (${work.publication_year ?? 2026}) on ${concepts.join(', ') || query}.`;
    if (!isRelevantToQuery(title, `${summary} ${concepts.join(' ')}`, query)) continue;
    items.push({
      id: `oa-${work.id?.split('/').pop() ?? Math.random().toString(36).slice(2, 8)}`,
      title,
      summary,
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

// 2. Crossref
async function fetchCrossref(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit + 6}&sort=relevance&order=desc`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Crossref HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const work of data?.message?.items ?? []) {
    const title = (Array.isArray(work.title) ? work.title[0] : work.title ?? '').trim();
    if (!title) continue;
    const rawAbs = String(work.abstract ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const subjects: string[] = Array.isArray(work.subject) ? work.subject.slice(0, 4) : [];
    const year = work.published?.['date-parts']?.[0]?.[0];
    const journal = Array.isArray(work['container-title']) ? work['container-title'][0] : '';
    const summary =
      rawAbs.length > 30
        ? rawAbs.slice(0, 460)
        : `Peer-reviewed article${journal ? ` in ${journal}` : ''} (${year ?? 'recent'}) covering ${subjects.join(', ') || query}.`;
    if (!isRelevantToQuery(title, `${summary} ${subjects.join(' ')}`, query)) continue;
    items.push({
      id: `cr-${work.DOI ? work.DOI.replace(/[^a-z0-9]/gi, '').slice(0, 14) : Math.random().toString(36).slice(2, 9)}`,
      title,
      summary,
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

// 3. DataCite
async function fetchDataCite(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://api.datacite.org/dois?query=${encodeURIComponent(query)}&page[size]=${limit + 4}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`DataCite HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const rec of data.data ?? []) {
    const attr = rec.attributes ?? {};
    const title = (attr.titles?.[0]?.title ?? '').trim();
    if (!title) continue;
    const desc = String(attr.descriptions?.[0]?.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const subjects: string[] = (attr.subjects ?? []).map((s: { subject?: string }) => s.subject ?? '').filter(Boolean).slice(0, 4);
    const summary = desc.length > 25 ? desc.slice(0, 440) : `Open dataset/report (${attr.publicationYear ?? ''}) — ${subjects.join(', ') || query}.`;
    if (!isRelevantToQuery(title, `${summary} ${subjects.join(' ')}`, query)) continue;
    items.push({
      id: `dc-${rec.id}`,
      title,
      summary,
      category: attr.types?.resourceTypeGeneral || 'Dataset',
      source: 'DataCite',
      url: attr.url || `https://doi.org/${rec.id}`,
      year: attr.publicationYear,
      tags: subjects,
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 4. PubMed / NCBI
async function fetchPubMed(query: string, limit: number): Promise<CorpusItem[]> {
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${limit + 4}&sort=relevance`;
  const sRes = await fetchWithTimeout(searchUrl);
  if (!sRes.ok) throw new Error(`PubMed HTTP ${sRes.status}`);
  const sData = await sRes.json();
  const ids: string[] = sData?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  const sumUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
  const sumRes = await fetchWithTimeout(sumUrl);
  if (!sumRes.ok) throw new Error(`PubMed summary HTTP ${sumRes.status}`);
  const sumData = await sumRes.json();
  const result = sumData?.result ?? {};
  const items: CorpusItem[] = [];
  for (const pmid of ids) {
    const rec = result[pmid];
    if (!rec?.title) continue;
    const title = String(rec.title).replace(/\.$/, '').trim();
    const journal = rec.fulljournalname || rec.source || 'PubMed';
    const year = rec.pubdate ? Number(String(rec.pubdate).slice(0, 4)) || undefined : undefined;
    const summary = `Biomedical study published in ${journal} (${rec.pubdate ?? ''}): ${title}.`;
    if (!isRelevantToQuery(title, summary, query)) continue;
    items.push({
      id: `pm-${pmid}`,
      title,
      summary,
      category: journal,
      source: 'PubMed',
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      year,
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

// 10. Open Library Books
async function fetchOpenLibrary(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQuery)}&limit=${limit + 6}&fields=key,title,author_name,first_publish_year,subject,first_sentence`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`OpenLibrary HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const doc of data.docs ?? []) {
    const title = (doc.title ?? '').trim();
    if (!title) continue;
    const subjects: string[] = Array.isArray(doc.subject) ? doc.subject.slice(0, 5) : [];
    const authors = Array.isArray(doc.author_name) ? doc.author_name.slice(0, 2).join(', ') : '';
    const firstSentence = Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : doc.first_sentence || '';
    const summary = `${firstSentence ? `${firstSentence} ` : ''}Book${authors ? ` by ${authors}` : ''}${doc.first_publish_year ? ` (${doc.first_publish_year})` : ''}${subjects.length ? ` covering ${subjects.join(', ')}` : ''}.`.trim();
    if (!isRelevantToQuery(title, `${summary} ${subjects.join(' ')}`, cleanQuery)) continue;
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

// 11. Internet Archive Aggregator
async function fetchArchiveOrg(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(cleanQuery)}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=year&fl[]=subject&rows=${limit + 6}&output=json`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Archive.org HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const doc of data?.response?.docs ?? []) {
    const title = (Array.isArray(doc.title) ? doc.title[0] : doc.title ?? '').trim();
    if (!title) continue;
    const rawDesc = Array.isArray(doc.description) ? doc.description[0] : doc.description ?? '';
    const desc = String(rawDesc).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const subs: string[] = Array.isArray(doc.subject)
      ? doc.subject.slice(0, 4)
      : doc.subject
        ? [String(doc.subject)]
        : [];
    const summary = desc.length > 25 ? desc.slice(0, 440) : `Archived work (${doc.year ?? ''}) covering ${subs.join(', ') || cleanQuery}.`;
    if (!isRelevantToQuery(title, `${summary} ${subs.join(' ')}`, cleanQuery)) continue;
    items.push({
      id: `ia-${doc.identifier}`,
      title,
      summary,
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

// 13. Lemmy Fediverse Community Aggregator
async function fetchLemmy(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://lemmy.world/api/v3/search?q=${encodeURIComponent(cleanQuery)}&type_=Posts&sort=TopAll&limit=${limit + 6}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Lemmy HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const entry of data.posts ?? []) {
    const post = entry.post ?? {};
    const comm = entry.community?.title || entry.community?.name || 'Community';
    const title = (post.name ?? '').trim();
    if (!title) continue;
    const body = String(post.body ?? '').replace(/[#*_`>\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
    const summary = body.length > 25 ? body.slice(0, 420) : `Community discussion in ${comm}: ${title}.`;
    if (!isRelevantToQuery(title, `${summary} ${comm}`, cleanQuery)) continue;
    items.push({
      id: `lm-${post.id}`,
      title,
      summary,
      category: comm,
      source: 'Lemmy',
      url: post.ap_id || post.url,
      year: post.published ? Number(String(post.published).slice(0, 4)) : undefined,
      tags: [comm],
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 14. Stack Exchange / Stack Overflow Q&A
async function fetchStackExchange(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://api.stackexchange.com/2.3/search/excerpts?order=desc&sort=relevance&q=${encodeURIComponent(cleanQuery)}&pagesize=${limit + 4}&site=stackoverflow`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`StackExchange HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const q of data.items ?? []) {
    if (q.item_type !== 'question') continue;
    const title = decodeHtmlEntities(String(q.title ?? '').replace(/<[^>]+>/g, '')).trim();
    const excerpt = decodeHtmlEntities(String(q.excerpt ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
    const tags: string[] = q.tags ?? [];
    if (!title || !isRelevantToQuery(title, `${excerpt} ${tags.join(' ')}`, cleanQuery)) continue;
    items.push({
      id: `se-${q.question_id}`,
      title,
      summary: excerpt.slice(0, 420) || title,
      category: tags[0] ?? 'Q&A',
      source: 'Stack Exchange',
      url: `https://stackoverflow.com/questions/${q.question_id}`,
      tags: tags.slice(0, 4),
    });
    if (items.length >= limit) break;
  }
  return items;
}

// 15. Apple iTunes Podcasts & Media Ecosystem
async function fetchItunes(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&limit=${limit + 6}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const r of data.results ?? []) {
    const title = (r.trackName || r.collectionName || '').trim();
    if (!title) continue;
    const kind = r.kind || r.wrapperType || 'Media';
    const genre = r.primaryGenreName || 'Media';
    const rawDesc = String(r.longDescription || r.description || r.shortDescription || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const summary =
      rawDesc.length > 20
        ? rawDesc.slice(0, 440)
        : `${genre} (${kind}) by ${r.artistName ?? 'creator'}: ${title}.`;
    if (!isRelevantToQuery(`${title} ${r.artistName ?? ''}`, `${summary} ${genre}`, cleanQuery)) continue;
    items.push({
      id: `it-${r.trackId || r.collectionId || Math.random().toString(36).slice(2, 8)}`,
      title: r.artistName && !title.toLowerCase().includes(r.artistName.toLowerCase()) ? `${title} (${r.artistName})` : title,
      summary,
      category: genre,
      source: 'Podcasts & Media',
      url: r.trackViewUrl || r.collectionViewUrl,
      year: r.releaseDate ? Number(String(r.releaseDate).slice(0, 4)) : undefined,
      tags: [genre, kind].filter(Boolean),
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
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
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
