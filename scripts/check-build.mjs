// scripts/check-build.mjs
//
// Post-build sanity check. Astro can exit 0 while emitting a site that is
// missing pages — a content collection error, a slug collision, a bad glob.
// Expected counts come from .bloglide-build.json, written by
// filter-by-visibility.mjs BEFORE it deletes anything. Walking the vault here
// instead would only confirm that the pipeline agreed with itself: a filter
// that removed every post would leave zero files producing zero pages, and
// this check would call that healthy.
import fs from 'node:fs'
import path from 'node:path'
import { fail, warn } from './report.mjs'
import { isPage, IGNORED_FILES } from '../src/lib/pages.mjs'

const projectRoot = path.join(import.meta.dirname, '..')
const buildManifestPath = path.join(projectRoot, '.bloglide-build.json')
const distDir = path.join(projectRoot, 'dist')
const config = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'bloglide.config.json'), 'utf8')
)

const IGNORED = new Set(IGNORED_FILES.map((f) => f.toLowerCase()))

if (!fs.existsSync(distDir)) {
  fail('dist/ does not exist. The build did not produce any output.')
}

if (!fs.existsSync(buildManifestPath)) {
  fail('.bloglide-build.json is missing. Did filter-by-visibility.mjs run?')
}

let publicPosts
try {
  ;({ publicPosts } = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8')))
} catch (error) {
  fail(`.bloglide-build.json could not be read: ${error.message}`)
}

if (!Array.isArray(publicPosts)) {
  fail('.bloglide-build.json is malformed: publicPosts is not an array.')
}

const slashes = (p) => p.split(path.sep).join('/')

const expected = publicPosts
  .map(slashes)
  .filter((key) => !isPage(key) && !IGNORED.has(key.toLowerCase()))

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
      `  Public posts after filtering:\n${expected.map((f) => `    - ${f}`).join('\n')}\n` +
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
  warn(
    'dist/404.html is missing. Unmatched URLs will fall back to GitHub\u2019s default page.'
  )
}

if (config.features?.rss && !distFiles.includes('rss.xml')) {
  problems.push('features.rss is enabled but dist/rss.xml was not generated.')
}

if (config.features?.topics && expected.length > 0) {
  if (!distFiles.some((p) => /(^|\/)topics\/index\.html$/.test(p))) {
    problems.push(
      'features.topics is enabled but dist/topics/index.html was not generated.'
    )
  }
}

if (problems.length > 0) {
  fail(
    `The build completed but the output is incomplete:\n` +
      problems.map((p) => `  - ${p}`).join('\n')
  )
}

console.log(
  `Build check: ${postPages.length} post page${postPages.length === 1 ? '' : 's'} from ${expected.length} public post${expected.length === 1 ? '' : 's'}. OK`
)