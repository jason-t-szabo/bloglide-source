// scripts/filter-by-visibility.mjs
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { join } from 'node:path'
import { fail } from './report.mjs'

const projectRoot = join(import.meta.dirname, '..')
const config = JSON.parse(
  fs.readFileSync(join(projectRoot, 'bloglide.config.json'), 'utf8')
)
const postsDir = join(projectRoot, 'src/content/vault')

const entries = fs.readdirSync(postsDir, { recursive: true })

const VISIBILITY = new Set(['public', 'friends', 'private'])

for (const entry of entries) {
  if (!/\.mdx?$/i.test(entry)) continue

  const filePath = path.join(postsDir, entry)
  const { data } = matter(fs.readFileSync(filePath, 'utf8'))

  const raw = data.visibility ?? 'public'
  const visibility = String(raw).trim().toLowerCase()

  if (!VISIBILITY.has(visibility)) {
    fail(`Invalid visibility "${raw}" in ${entry}. Use public, friends, or private.`)
  }

  fs.unlinkSync(filePath)
  console.log(`Excluded (${visibility}): ${entry}`)
}

// When features.gatedPosts is enabled, this is where a second pass writes
// the excluded posts to a manifest for the Mongo sync job to consume.
console.log(`Gated posts feature: ${config.features.gatedPosts ? 'on' : 'off'}`)
