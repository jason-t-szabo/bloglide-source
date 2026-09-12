// scripts/check-config.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fail } from './report.mjs'

const projectRoot = path.join(import.meta.dirname, '..')
const configPath = path.join(projectRoot, 'bloglide.config.json')

const problems = []
const add = (message) => problems.push(message)

if (!fs.existsSync(configPath)) {
  fail('bloglide.config.json is missing from the project root.')
}

let config
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
} catch (error) {
  fail(`bloglide.config.json is not valid JSON: ${error.message}`)
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

const requireString = (obj, key, label) => {
  const value = obj?.[key]
  if (typeof value !== 'string' || value.trim() === '') {
    add(`${label} must be a non-empty string (found ${JSON.stringify(value)}).`)
    return null
  }
  return value
}

requireString(config, 'blogId', 'blogId')

if (!Number.isInteger(config.idSaltVersion) || config.idSaltVersion < 1) {
  add(`idSaltVersion must be a positive integer (found ${JSON.stringify(config.idSaltVersion)}).`)
}

if (!isObject(config.site)) {
  add('site must be an object.')
} else {
  requireString(config.site, 'title', 'site.title')
  requireString(config.site, 'description', 'site.description')

  const url = requireString(config.site, 'url', 'site.url')
  if (url) {
    try {
      const parsed = new URL(url)
      if (parsed.pathname !== '/') {
        add(`site.url must be an origin only — move "${parsed.pathname}" into site.base.`)
      }
    } catch {
      add(`site.url is not a valid URL: ${url}`)
    }
  }

  const base = requireString(config.site, 'base', 'site.base')
  if (base !== null) {
    if (base !== '' && !base.startsWith('/')) {
      add(`site.base must start with "/" or be empty (found "${base}").`)
    }
    if (base.length > 1 && base.endsWith('/')) {
      add(`site.base must not end with "/" (found "${base}").`)
    }
  }

  for (const key of ['timezone', 'displayTimezone']) {
    const zone = config.site[key]
    if (zone === undefined && key === 'displayTimezone') continue
    if (typeof zone !== 'string') {
      add(`site.${key} must be a string (found ${JSON.stringify(zone)}).`)
      continue
    }
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: zone })
    } catch {
      add(`site.${key} is not a recognized IANA time zone: "${zone}". Example: "America/Chicago".`)
    }
  }

  const language = requireString(config.site, 'language', 'site.language')
  if (language) {
    try {
      Intl.getCanonicalLocales(language)
    } catch {
      add(`site.language is not a valid BCP-47 language tag: "${language}". Example: "en-us".`)
    }
  }
}

const FEATURES = ['topics', 'rss', 'gatedPosts', 'comments']

if (!isObject(config.features)) {
  add('features must be an object.')
} else {
  for (const key of FEATURES) {
    if (typeof config.features[key] !== 'boolean') {
      add(`features.${key} must be true or false (found ${JSON.stringify(config.features[key])}).`)
    }
  }
  for (const key of Object.keys(config.features)) {
    if (!FEATURES.includes(key)) {
      add(`features.${key} is not a recognized feature flag. Check the spelling.`)
    }
  }
}

if (!isObject(config.backend)) {
  add('backend must be an object.')
} else {
  const api = config.backend.apiBaseUrl
  if (api !== null) {
    if (typeof api !== 'string') {
      add(`backend.apiBaseUrl must be a URL string or null (found ${JSON.stringify(api)}).`)
    } else {
      try {
        new URL(api)
      } catch {
        add(`backend.apiBaseUrl is not a valid URL: "${api}"`)
      }
    }
  }

  const needsBackend = ['gatedPosts', 'comments'].filter(
    (key) => config.features?.[key] === true
  )
  if (needsBackend.length > 0 && !api) {
    add(`backend.apiBaseUrl is required when ${needsBackend.join(' or ')} is enabled.`)
  }
}

if (problems.length > 0) {
  fail(
    `bloglide.config.json has ${problems.length} problem${problems.length > 1 ? 's' : ''}:\n` +
      problems.map((p) => `  - ${p}`).join('\n')
  )
}

console.log('bloglide.config.json: OK')