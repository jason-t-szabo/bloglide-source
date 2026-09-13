// scripts/report.mjs
const inCI = process.env.GITHUB_ACTIONS === 'true'

const encode = (m) => m.replace(/%/g, '%25').replace(/\r?\n/g, '%0A')

export function warn(message) {
  console.log(inCI ? `\n::warning title=Bloglide::${encode(message)}` : `[bloglide] ${message}`)
}

export function fail(message) {
  console.log(inCI ? `\n::error title=Bloglide::${encode(message)}` : `[bloglide] ERROR ${message}`)
  process.exit(1)
}

export function parseFrontmatter(matterFn, raw, label) {
  try {
    return matterFn(raw)
  } catch (error) {
    fail(`Could not read frontmatter in ${label}: ${error.message}`)
  }
}