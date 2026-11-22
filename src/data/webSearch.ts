/**
 * 100% Client-Side CORS-Enabled Web Search & Knowledge Harvesters!
 * Works natively on GitHub Pages with ZERO backend proxy:
 * 1. Wikipedia Spell-Check + Phrase-Anchored Search & Extract API
 * 2. OpenAlex API + Crossref Fallback (250M+ scientific & engineering works)
 * 3. Hacker News Algolia Search API (strict non-fuzzy relevance filtering)
 * 4. GitHub Repositories Search API (active open-source tooling)
 *
 * Includes automatic spelling resolution (e.g. "Sidney sweeney" -> "sydney sweeney")
 * and query-token relevance gating so unrelated hits never pollute the vector manifold!
 */

import type { CorpusItem } from '../types.ts';

export type WebSourceId = 'openalex' | 'wikipedia' | 'hackernews' | 'github';

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

/**
 * Checks whether a candidate document genuinely relates to the query (prevents
 * Algolia fuzzy hits like "sweeteners" for "sweeney" or random OpenAlex author collisions).
 */
function isRelevantToQuery(title: string, summary: string, query: string): boolean {
  const hay = `${title} ${summary}`.toLowerCase();
  const tokens = significantQueryTokens(query);
  if (tokens.length === 0) return true;

  // Exact full-phrase match always passes
  const normalizedPhrase = tokens.join(' ');
  if (hay.includes(normalizedPhrase)) return true;

  // For 1-2 word queries (often proper nouns / specific entities like "sydney sweeney"),
  // require ALL significant tokens to appear somewhere in title+summary
  let matched = 0;
  for (const tok of tokens) {
    // Word-boundary check so "sweeney" doesn't match unrelated substrings
    const re = new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (re.test(hay)) matched++;
  }
  if (tokens.length <= 2) return matched === tokens.length;
  // For longer multi-word technical queries, require at least 60% of tokens (min 2)
  return matched >= Math.max(2, Math.ceil(tokens.length * 0.6));
}

/** Use Wikipedia's spell-checker to auto-correct typos like "Sidney sweeney" -> "sydney sweeney" */
async function resolveQuerySpelling(rawQuery: string): Promise<{ resolved: string; corrected: boolean }> {
  const clean = rawQuery.trim();
  const noYear = clean.replace(/\b20\d{2}\b/g, '').trim() || clean;
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(noYear)}&srlimit=3&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return { resolved: clean, corrected: false };
    const data = await res.json();
    const suggestion: string | undefined = data?.query?.searchinfo?.suggestion;
    if (suggestion && suggestion.toLowerCase() !== noYear.toLowerCase()) {
      return { resolved: suggestion, corrected: true };
    }
  } catch {
    // Ignore spellcheck network failure
  }
  return { resolved: clean, corrected: false };
}

/** Reconstruct OpenAlex abstract from inverted index format */
function reconstructOpenAlexAbstract(inverted?: Record<string, number[]>): string {
  if (!inverted) return '';
  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) words.push([pos, word]);
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map((w) => w[1]).join(' ').slice(0, 480);
}

async function fetchCrossrefFallback(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit + 6}&sort=relevance&order=desc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Crossref HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const work of data?.message?.items ?? []) {
    const title = (Array.isArray(work.title) ? work.title[0] : work.title ?? '').trim();
    if (!title) continue;
    const rawAbs = String(work.abstract ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const subjects: string[] = Array.isArray(work.subject) ? work.subject.slice(0, 4) : [];
    const year = work.published?.['date-parts']?.[0]?.[0];
    const summary =
      rawAbs.length > 30
        ? rawAbs.slice(0, 460)
        : `Peer-reviewed publication (${year ?? 'recent'}) covering ${subjects.join(', ') || query}.`;
    if (!isRelevantToQuery(title, `${summary} ${subjects.join(' ')}`, query)) continue;
    items.push({
      id: `cr-${work.DOI ? work.DOI.replace(/[^a-z0-9]/gi, '').slice(0, 14) : Math.random().toString(36).slice(2, 9)}`,
      title,
      summary,
      category: subjects[0] ?? 'Research Paper',
      source: 'Crossref',
      url: work.URL || (work.DOI ? `https://doi.org/${work.DOI}` : undefined),
      year,
      tags: subjects,
    });
    if (items.length >= limit) break;
  }
  return items;
}

async function fetchOpenAlex(query: string, limit: number): Promise<CorpusItem[]> {
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit + 6}&sort=relevance_score:desc&filter=from_publication_date:2022-01-01,language:en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
    const data = await res.json();
    const items: CorpusItem[] = [];
    for (const work of data.results ?? []) {
      const title = (work.display_name ?? '').trim();
      if (!title) continue;
      const abstract = reconstructOpenAlexAbstract(work.abstract_inverted_index);
      const concepts = (work.concepts ?? [])
        .slice(0, 5)
        .map((c: { display_name: string }) => c.display_name);
      const summary =
        abstract.length > 40
          ? abstract
          : `Research publication (${work.publication_year ?? 2026}) covering ${concepts.join(', ') || query}.`;
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
    if (items.length >= 3) return items;
    const cr = await fetchCrossrefFallback(query, limit);
    return items.length > 0 ? [...items, ...cr] : cr;
  } catch {
    return fetchCrossrefFallback(query, limit);
  }
}

async function fetchWikipedia(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const tokens = significantQueryTokens(cleanQuery);
  const fetchLimit = Math.max(limit, 22);

  // For 2-3 word topics/entities, try exact phrase search first for laser-sharp relevance
  let hits: Array<{ pageid: number; title: string; snippet: string }> = [];
  if (tokens.length >= 2 && tokens.length <= 4) {
    const phraseUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`"${cleanQuery}"`)}&srlimit=${fetchLimit}&format=json&origin=*`;
    const pRes = await fetch(phraseUrl);
    if (pRes.ok) {
      const pData = await pRes.json();
      hits = pData?.query?.search ?? [];
    }
  }

  // Fallback / top-up with standard Wikipedia search if phrase search returned too few hits
  if (hits.length < 10) {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&srlimit=${fetchLimit}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`Wikipedia HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const extra: Array<{ pageid: number; title: string; snippet: string }> =
      searchData?.query?.search ?? [];
    const seenIds = new Set(hits.map((h) => h.pageid));
    for (const e of extra) {
      if (!seenIds.has(e.pageid)) {
        // Guard against noisy non-phrase hits by checking snippet/title relevance
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

  // Fetch clean intro extracts + Wikipedia categories (for rich domain tags!)
  const pageIds = capped.map((h) => h.pageid).join('|');
  const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|categories&exintro=1&explaintext=1&exchars=440&clshow=!hidden&cllimit=6&pageids=${pageIds}&format=json&origin=*`;
  const extRes = await fetch(extractUrl);
  const extData = extRes.ok ? await extRes.json() : null;
  const pages = extData?.query?.pages ?? {};

  return capped.map((h) => {
    const page = pages[h.pageid];
    const extract: string =
      page?.extract || h.snippet.replace(/<[^>]+>/g, '');
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

async function fetchHackerNews(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  const tokens = significantQueryTokens(cleanQuery);
  const qParam = tokens.length >= 2 && tokens.length <= 3 ? `"${cleanQuery}"` : cleanQuery;
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(qParam)}&tags=story&hitsPerPage=${limit + 6}&advancedSyntax=true&typoTolerance=false`;
  const res = await fetch(url);
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
      summary:
        text.length > 30
          ? text.slice(0, 420)
          : `Discussion (${hit.points ?? 0} points, ${hit.num_comments ?? 0} comments): ${title}.`,
      category: 'Industry Discussion',
      source: 'Hacker News',
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      year,
    });
    if (items.length >= limit) break;
  }
  return items;
}

async function fetchGitHub(query: string, limit: number): Promise<CorpusItem[]> {
  const cleanQuery = query.replace(/\b20\d{2}\b/g, '').trim() || query;
  // Filter out 0-star homework/spam repos so GitHub only contributes real open-source projects
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(cleanQuery + ' stars:>=5')}&sort=stars&order=desc&per_page=${limit + 4}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
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

export async function harvestWebCorpus(
  rawQuery: string,
  sources: WebSourceId[],
  perSourceLimit = 14,
  onProgress?: (p: HarvestProgress) => void
): Promise<HarvestResult> {
  // 1. Auto-correct obvious spelling typos via Wikipedia before fanning out
  const { resolved: query, corrected: wasCorrected } = await resolveQuerySpelling(rawQuery);

  const fetchers: Record<WebSourceId, () => Promise<CorpusItem[]>> = {
    openalex: () => fetchOpenAlex(query, perSourceLimit),
    wikipedia: () => fetchWikipedia(query, perSourceLimit),
    hackernews: () => fetchHackerNews(query, perSourceLimit),
    github: () => fetchGitHub(query, perSourceLimit),
  };

  const results = await Promise.all(
    sources.map(async (src) => {
      onProgress?.({ source: src, fetched: 0, status: 'fetching' });
      try {
        const docs = await fetchers[src]();
        onProgress?.({ source: src, fetched: docs.length, status: 'done' });
        return docs;
      } catch (err) {
        onProgress?.({
          source: src,
          fetched: 0,
          status: 'error',
          message: err instanceof Error ? err.message : 'Network error',
        });
        return [] as CorpusItem[];
      }
    })
  );

  // Deduplicate by normalized title
  const seen = new Set<string>();
  const merged: CorpusItem[] = [];
  for (const list of results) {
    for (const item of list) {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return { items: merged, resolvedQuery: query, wasCorrected };
}
