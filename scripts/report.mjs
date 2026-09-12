// scripts/report.mjs
const inCI = process.env.GITHUB_ACTIONS === 'true'

export function warn(message) {
  console.log(inCI ? `::warning title=Bloglide::${message}` : `[bloglide] ${message}`)
}

export function fail(message) {
  console.log(inCI ? `::error title=Bloglide::${message}` : `[bloglide] ERROR ${message}`)
  process.exit(1)
}

export function parseFrontmatter(matterFn, raw, label) {
  try {
    return matterFn(raw)
  } catch (error) {
    fail(`Could not read frontmatter in ${label}: ${error.message}`)
  }
}