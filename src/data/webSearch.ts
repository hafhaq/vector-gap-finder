/**
 * 100% Client-Side CORS-Enabled Web Search & Knowledge Harvesters!
 * Works natively on GitHub Pages with ZERO backend proxy:
 * 1. OpenAlex API (250M+ scientific, patent, and 2024-2026 engineering research works)
 * 2. Wikipedia Search + Extract API (canonical technical concepts & architectures)
 * 3. Hacker News Algolia Search API (real-world engineering & market discussions)
 * 4. GitHub Repositories Search API (active open-source tooling & capabilities)
 */

import type { CorpusItem } from '../types.ts';

export type WebSourceId = 'openalex' | 'wikipedia' | 'hackernews' | 'github';

export interface HarvestProgress {
  source: WebSourceId;
  fetched: number;
  status: 'fetching' | 'done' | 'error';
  message?: string;
}

/** Reconstruct OpenAlex abstract from inverted index format */
function reconstructOpenAlexAbstract(inverted?: Record<string, number[]>): string {
  if (!inverted) return '';
  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) words.push([pos, word]);
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map((w) => w[1]).join(' ').slice(0, 460);
}

async function fetchOpenAlex(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&sort=relevance_score:desc&filter=from_publication_date:2022-01-01`;
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
  }
  return items;
}

async function fetchWikipedia(query: string, limit: number): Promise<CorpusItem[]> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`Wikipedia HTTP ${searchRes.status}`);
  const searchData = await searchRes.json();
  const hits: Array<{ pageid: number; title: string; snippet: string }> =
    searchData?.query?.search ?? [];
  if (hits.length === 0) return [];

  const pageIds = hits.map((h) => h.pageid).join('|');
  const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exchars=420&pageids=${pageIds}&format=json&origin=*`;
  const extRes = await fetch(extractUrl);
  const extData = extRes.ok ? await extRes.json() : null;
  const pages = extData?.query?.pages ?? {};

  return hits.map((h) => {
    const extract: string =
      pages[h.pageid]?.extract ||
      h.snippet.replace(/<[^>]+>/g, '');
    return {
      id: `wiki-${h.pageid}`,
      title: h.title,
      summary: extract.trim().slice(0, 460),
      category: 'Encyclopedia Concept',
      source: 'Wikipedia',
      url: `https://en.wikipedia.org/?curid=${h.pageid}`,
    };
  });
}

async function fetchHackerNews(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN Algolia HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const hit of data.hits ?? []) {
    const title = (hit.title ?? '').trim();
    if (!title) continue;
    const text = (hit.story_text ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const year = hit.created_at ? Number(hit.created_at.slice(0, 4)) : undefined;
    items.push({
      id: `hn-${hit.objectID}`,
      title,
      summary:
        text.length > 30
          ? text.slice(0, 420)
          : `Industry discussion on Hacker News (${hit.points ?? 0} points, ${hit.num_comments ?? 0} comments) regarding ${title}.`,
      category: 'Industry Discussion',
      source: 'Hacker News',
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      year,
    });
  }
  return items;
}

async function fetchGitHub(query: string, limit: number): Promise<CorpusItem[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
  const data = await res.json();
  const items: CorpusItem[] = [];
  for (const repo of data.items ?? []) {
    const desc = (repo.description ?? '').trim();
    const topics: string[] = repo.topics ?? [];
    items.push({
      id: `gh-${repo.id}`,
      title: repo.full_name,
      summary: `${desc || 'Open-source repository'}${topics.length ? ` — Topics: ${topics.slice(0, 6).join(', ')}` : ''}${repo.language ? ` (${repo.language}, ★${repo.stargazers_count})` : ''}`,
      category: repo.language || 'Open Source',
      source: 'GitHub',
      url: repo.html_url,
      year: repo.updated_at ? Number(repo.updated_at.slice(0, 4)) : undefined,
      tags: topics.slice(0, 6),
    });
  }
  return items;
}

export async function harvestWebCorpus(
  query: string,
  sources: WebSourceId[],
  perSourceLimit = 14,
  onProgress?: (p: HarvestProgress) => void
): Promise<CorpusItem[]> {
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
  return merged;
}
