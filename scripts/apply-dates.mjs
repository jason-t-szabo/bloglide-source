// scripts/apply-dates.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import { formatInTimeZone } from 'date-fns-tz';
import { isPage } from '../src/lib/pages.mjs';

const projectRoot = path.join(import.meta.dirname, '..');
const postsDir = path.join(projectRoot, 'src/content/vault');
const manifestPath = path.join(projectRoot, 'post-dates.json');
const { site } = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'bloglide.config.json'), 'utf8')
);

const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};

const nowUtc = new Date().toISOString();
const naive = (utc) => formatInTimeZone(new Date(utc), site.timezone, "yyyy-MM-dd'T'HH:mm:ss");
const byHash = new Map(Object.entries(manifest).map(([k, v]) => [v.hash, v]));

for (const entry of fs.readdirSync(postsDir, { recursive: true })) {
  if (!/\.mdx?$/i.test(entry)) continue;
  const key = entry.split(path.sep).join('/');
  if (key.split('/').some((seg) => seg.startsWith('_'))) continue;

  const filePath = path.join(postsDir, entry);
  const raw = fs.readFileSync(filePath, 'utf8');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const { data, content } = matter(raw);

  const prior = manifest[key] ?? byHash.get(hash);
  let record = !prior
    ? { pubDate: nowUtc, updatedDate: null, hash }
    : prior.hash === hash
      ? prior
      : { ...prior, updatedDate: nowUtc, hash };

  // Pages have no pubDate, so seed updatedDate from first-seen time.
  if (isPage(key) && !record.updatedDate) {
    record = { ...record, updatedDate: record.pubDate };
  }

  manifest[key] = record;

  let touched = false;
  if (!isPage(key) && !data.pubDate) { data.pubDate = naive(record.pubDate); touched = true; }
  if (!data.updatedDate && record.updatedDate) { data.updatedDate = naive(record.updatedDate); touched = true; }
  if (touched) fs.writeFileSync(filePath, matter.stringify(content, data));
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');