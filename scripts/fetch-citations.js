#!/usr/bin/env node
// Fetch citation counts from Crossref for each DOI in publications.json
// and rewrite the file with counts + a top-level lastUpdated timestamp.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const PUB_PATH = resolve(here, '..', 'content', 'publications.json');
const UA = 'jeremyfan-site/1.0 (mailto:zheming.fan@gmail.com)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractDoi(pub) {
  const url = pub?.links?.DOI;
  if (!url) return null;
  return url.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
}

async function fetchCitationCount(doi) {
  const res = await fetch(`https://api.crossref.org/works/${encodeURI(doi)}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Crossref ${res.status} for ${doi}`);
  const data = await res.json();
  return data?.message?.['is-referenced-by-count'] ?? null;
}

const raw = JSON.parse(await readFile(PUB_PATH, 'utf8'));
const publications = Array.isArray(raw) ? raw : raw.publications;

const updated = [];
for (const pub of publications) {
  const doi = extractDoi(pub);
  if (!doi) {
    updated.push(pub);
    continue;
  }
  try {
    const count = await fetchCitationCount(doi);
    console.log(`  ${count ?? '—'}\t${doi}`);
    updated.push({ ...pub, citations: count });
  } catch (err) {
    console.warn(`  ERR\t${doi}: ${err.message}`);
    updated.push(pub);
  }
  await sleep(200); // be polite to crossref
}

const out = {
  lastUpdated: new Date().toISOString(),
  publications: updated,
};

await writeFile(PUB_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(`\nWrote ${updated.length} publications, lastUpdated=${out.lastUpdated}`);
