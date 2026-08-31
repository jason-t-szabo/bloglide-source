// scripts/filter-by-visibility.mjs
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const config = JSON.parse(fs.readFileSync('bloglide.config.json', 'utf8'));
const postsDir = path.join(process.cwd(), 'src/content/blog');

const entries = fs.readdirSync(postsDir, { recursive: true });

for (const entry of entries) {
  if (!/\.mdx?$/i.test(entry)) continue;

  const filePath = path.join(postsDir, entry);
  const { data } = matter(fs.readFileSync(filePath, 'utf8'));
  const visibility = data.visibility ?? 'public';

  if (visibility === 'public' && !data.draft) continue;

  fs.unlinkSync(filePath);
  console.log(`Excluded (${visibility}${data.draft ? ', draft' : ''}): ${entry}`);
}

// When features.gatedPosts is enabled, this is where a second pass writes
// the excluded posts to a manifest for the Mongo sync job to consume.
console.log(`Gated posts feature: ${config.features.gatedPosts ? 'on' : 'off'}`);
