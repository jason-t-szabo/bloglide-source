// scripts/check-build.mjs
//
// Post-build sanity check. Astro can exit 0 while emitting a site that is
// missing pages — a content collection error, a slug collision, a bad glob.
// This compares what the vault contains against what dist actually holds.
import fs from 'node:fs'
import path from 'node:path'
import { fail, warn } from './report.mjs'
import { isPostFile } from './paths.mjs'
import { isPage, IGNORED_FILES } from '../src/lib/pages.mjs'

const projectRoot = path.join(import.meta.dirname, '..')
const vaultDir = path.join(projectRoot, 'src/content/vault')
const distDir = path.join(projectRoot, 'dist')
const config = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'bloglide.config.json'), 'utf8')
)

const IGNORED = new Set(IGNORED_FILES.map((f) => f.toLowerCase()))

if (!fs.existsSync(distDir)) {
  fail('dist/ does not exist. The build did not produce any output.')
}

const slashes = (p) => p.split(path.sep).join('/')

const expected = []

if (fs.existsSync(vaultDir)) {
  for (const entry of fs.readdirSync(vaultDir, { recursive: true })) {
    const key = slashes(entry)
    if (!isPostFile(key)) continue
    if (isPage(key) || IGNORED.has(key.toLowerCase())) continue
    expected.push(key)
  }
}

const distFiles = fs.readdirSync(distDir, { recursive: true }).map(slashes)

const postPages = distFiles.filter(
  (p) =>
    /(^|\/)posts\/.+\/index\.html$/.test(p) || /(^|\/)posts\/.+\.html$/.test(p)
)

const problems = []

if (postPages.length < expected.length) {
  problems.push(
    `Expected ${expected.length} post page${expected.length === 1 ? '' : 's'} ` +
      `but dist contains ${postPages.length}.\n` +
      `  Posts in the vault:\n${expected.map((f) => `    - ${f}`).join('\n')}\n` +
      `  Pages built:\n${
        postPages.length ?
          postPages.map((f) => `    - ${f}`).join('\n')
        : '    (none)'
      }`
  )
}

if (!distFiles.includes('index.html')) {
  problems.push('dist/index.html is missing — the home page did not build.')
}

if (!distFiles.includes('404.html')) {
  warn('dist/404.html is missing. Unmatched URLs will fall back to GitHub\u2019s default page.')
}

if (config.features?.rss && !distFiles.includes('rss.xml')) {
  problems.push('features.rss is enabled but dist/rss.xml was not generated.')
}

if (config.features?.topics && expected.length > 0) {
  if (!distFiles.some((p) => /(^|\/)topics\/index\.html$/.test(p))) {
    problems.push('features.topics is enabled but dist/topics/index.html was not generated.')
  }
}

if (problems.length > 0) {
  fail(
    `The build completed but the output is incomplete:\n` +
      problems.map((p) => `  - ${p}`).join('\n')
  )
}

console.log(
  `Build check: ${postPages.length} post page${postPages.length === 1 ? '' : 's'} from ${expected.length} vault file${expected.length === 1 ? '' : 's'}. OK`
)