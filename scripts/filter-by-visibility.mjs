// scripts/filter-by-visibility.mjs
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { join } from 'node:path'
import { fail, parseFrontmatter } from './report.mjs'
import { isPostFile } from './paths.mjs'

const projectRoot = join(import.meta.dirname, '..')
const config = JSON.parse(
  fs.readFileSync(join(projectRoot, 'bloglide.config.json'), 'utf8')
)
const postsDir = join(projectRoot, 'src/content/vault')

const entries = fs.readdirSync(postsDir, { recursive: true })

const VISIBILITY = new Set(['public', 'friends', 'private'])

// Recorded before anything is deleted, so check-build.mjs can compare the
// built output against what should have survived rather than against the
// post-filter vault, which would only confirm the pipeline agreed with itself.
const kept = []

for (const entry of entries) {
  if (!isPostFile(entry)) continue

  const filePath = path.join(postsDir, entry)
  const { data } = parseFrontmatter(
    matter,
    fs.readFileSync(filePath, 'utf8'),
    entry
  )

  const raw = data.visibility ?? 'public'
  const visibility = String(raw).trim().toLowerCase()

  if (!VISIBILITY.has(visibility)) {
    fail(
      `Invalid visibility "${raw}" in ${entry}. Use public, friends, or private.`
    )
  }

  if (visibility === 'public') {
    kept.push(entry.split(path.sep).join('/'))
    continue
  }

  fs.unlinkSync(filePath)
  console.log(`Excluded (${visibility}): ${entry}`)
}

fs.writeFileSync(
  join(projectRoot, '.bloglide-build.json'),
  JSON.stringify({ publicPosts: kept }, null, 2) + '\n'
)

console.log(`Kept ${kept.length} public post${kept.length === 1 ? '' : 's'}.`)

// When features.gatedPosts is enabled, this is where a second pass writes
// the excluded posts to a manifest for the Mongo sync job to consume.
console.log(`Gated posts feature: ${config.features.gatedPosts ? 'on' : 'off'}`)