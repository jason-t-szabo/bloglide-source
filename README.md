# Bloglide

A blog publishing system built so that writing and updating content requires no
web development skill. Authors write Markdown in Obsidian; a three-repository
pipeline mirrors, filters, builds, and deploys to GitHub Pages.

Version 0.3.0. Public posts, topics, Obsidian authoring, and RSS are working.
Gated posts, comments, and theming are not yet built — see [Roadmap](#roadmap).

---

## Architecture

Three repositories, each with one job:

| Repository | Visibility | Contents | Role |
| --- | --- | --- | --- |
| `bloglide-posts` | private | the author's Obsidian vault | what the author touches |
| `bloglide-source` | private | this Astro project | build machinery |
| `bloglide-site` | public | `gh-pages` branch only | what readers see |

```
bloglide-posts ──(sync-to-source.yml)──▶ bloglide-source ──(deploy.yml)──▶ bloglide-site
   Obsidian vault      rsync allowlist        Astro build         gh-pages / GitHub Pages
```

### Why three

The vault must be a repository *root* so Obsidian Git works on mobile, and the
vault must not contain an Astro project or authors would see `node_modules` and
config files in their note tree. The published repository is separate because it
holds only build output — its entire history is disposable, and it is the only
public one.

### Why the deploy key

Pushes made with the default `GITHUB_TOKEN` do not trigger downstream
workflows, which would break the chain at the first hop. Each cross-repository
push therefore uses a dedicated SSH deploy key. The one exception is
`deploy.yml` committing `post-dates.json` back to its own repository, where
*not* triggering a workflow is exactly what we want — an infinite loop
otherwise.

---

## Repository setup

### `bloglide-posts`

- **Actions variable** `SOURCE_REPO` — `owner/bloglide-source`
- **Actions secret** `SOURCE_DEPLOY_KEY` — private half of a keypair whose
  public half is a write-enabled deploy key on `bloglide-source`

### `bloglide-source`

- **Actions variable** `SITE_REPO` — `owner/bloglide-site`
- **Actions secret** `SITE_DEPLOY_KEY` — private half of a keypair whose public
  half is a write-enabled deploy key on `bloglide-site`
- **Actions secret** `BLOGLIDE_ID_SALT` — per-blog salt for gated post IDs (not
  yet consumed; see `bloglide-cli`)
- **Settings → Actions → General → Workflow permissions** must be **Read and
  write**. This sets a ceiling, not a grant; `deploy.yml` narrows itself to
  `contents: write`. With the repository set to read-only, that grant is
  silently capped and pushes fail with a 403.

### `bloglide-site`

Nothing but the deploy key. Do not initialise it with a README — the first
deploy creates an orphan `gh-pages` branch. Set **Settings → Pages** to serve
from `gh-pages` *after* the first successful deploy, since the branch does not
exist before then.

---

## Configuration

`bloglide.config.json` is the only file that differs between deployments.
Everything else is identical across every author.

```json
{
  "blogId": "<uuid>",
  "idSaltVersion": 1,
  "site": {
    "title": "...",
    "description": "...",
    "url": "https://<owner>.github.io",
    "base": "/bloglide-site",
    "timezone": "America/Chicago",
    "displayTimezone": "UTC",
    "language": "en-us"
  },
  "features": {
    "topics": true,
    "rss": true,
    "gatedPosts": false,
    "comments": false
  },
  "backend": { "apiBaseUrl": null }
}
```

| Key | Notes |
| --- | --- |
| `blogId` | UUID, stable forever. Must be unique across all deployments — the ID salt derives from it. |
| `idSaltVersion` | Which master key version derived this blog's salt. Never change on an existing blog. |
| `site.url` | Origin only. Paths belong in `base`; `check-config.mjs` enforces this. |
| `site.base` | Must match the site repository name for GitHub project pages. Leading slash, no trailing slash. |
| `site.timezone` | IANA zone used to interpret Obsidian's naive timestamps. Not a display setting. |
| `site.displayTimezone` | Optional. The zone the server-rendered fallback uses. Set to `UTC` for an author who does not want their location inferable. Defaults to `site.timezone`. |
| `features.*` | Gate both code paths and routes. A public-only deployment runs the same workflow files as a full one. |

`scripts/check-config.mjs` validates all of this and runs automatically via the
`prebuild` npm hook, so it covers local builds and CI without a workflow step.
It reports every problem at once and rejects unknown feature flags, which is
what catches a typo like `"rrs"` that would otherwise read as `undefined` and
silently disable a feature.

---

## The build pipeline

`deploy.yml`, in order:

1. **checkout** with `fetch-depth: 0` — a shallow history makes the rebase in
   step 3 unreliable
2. **setup-node 22** and `npm ci`
3. **`git pull --rebase origin main`** — runs before anything dirties the tree,
   because `apply-dates.mjs` modifies the Markdown files and `pull --rebase`
   refuses to run against uncommitted changes
4. **`scripts/apply-dates.mjs`** — injects `pubDate` / `updatedDate`
5. **`scripts/filter-by-visibility.mjs`** — deletes non-public posts, writes
   `.bloglide-build.json`
6. **`npm run build`** — `prebuild` runs `check-config.mjs` first
7. **`scripts/check-build.mjs`** — smoke test, before the deploy so a bad build
   never replaces a working site
8. **commit `post-dates.json`** — after the build, so a failed run does not
   record dates for posts that never published
9. **deploy** to `bloglide-site` via `peaceiris/actions-gh-pages`

Step order is load-bearing in three places. Dates must precede filtering or
gated posts lose their manifest entries and reset their publication dates on
every build. The rebase must precede both. The smoke test must precede the
deploy.

### The mirror

`sync-to-source.yml` in `bloglide-posts` uses an rsync **allowlist**: only
Markdown and images cross. Anything else an author keeps in their vault — a PDF,
a Canvas file, a spreadsheet — stays out and cannot break the build.

Extensions are matched case-insensitively (`*.[jJ][pP][gG]`) because phone
cameras produce `IMG_1234.JPG`. Underscore-prefixed paths and dotfiles are
excluded before the directory rule, so `_drafts/` and `.obsidian/` never reach
`bloglide-source`. `--delete-excluded` makes the mirror authoritative;
`mkdir -p` handles the empty-vault case, where the target directory does not
exist because git does not track empty directories.

---

## Content model

Both collections read `src/content/vault/`, which is a mirror of the author's
vault. The directory name says what it is rather than what it holds — it
contains posts, pages, and images.

### `blog`

Every field is optional or defaulted, so an author can publish a bare Markdown
file with no frontmatter at all.

| Field | Notes |
| --- | --- |
| `title` | Falls back to the filename via `entryTitle()` — derived at render time, never injected |
| `description` | Absent means absent; no sentinel default |
| `pubDate` / `updatedDate` | Injected by `apply-dates.mjs`. Optional in the schema because the script does not run in dev |
| `heroImage` | Vault-absolute path string, resolved via `import.meta.glob` |
| `heroImageAlt` | Missing alt text warns at build time |
| `visibility` | `public` \| `friends` \| `private`, defaults to `public` |
| `topics` | Free-form strings, normalised at render time |
| `tags`, `aliases`, `cssclasses` | Declared but never read — they exist so Obsidian's own features do not break the build |

The schema is `.strict()`. This is the single most important guard in the
system: with every field optional, a misspelled key like `visbility` would
otherwise fall back to the `public` default and publish a gated post. Strict
mode turns that into a build failure. Undeclared Obsidian fields must therefore
be added to the schema as they are discovered, never absorbed with
`.passthrough()`.

### `pages`

Vault files that become fixed routes rather than posts. `src/lib/pages.mjs`
holds the single source of truth:

```javascript
export const PAGE_FILES = ['About.md']
export const IGNORED_FILES = ['README.md']
```

`anyCase()` expands these into case-insensitive globs, so `about.md` and
`ABOUT.md` behave identically. Adding a page means adding one array entry and
one route file — nothing in the workflows changes.

### Publication state

Location, not a flag. New notes are created in `_drafts/` by an Obsidian
setting; moving a file to the vault root publishes it. This was chosen over an
`isPublished` frontmatter field because either default is wrong: defaulting true
leaks unfinished posts under mobile auto-sync, and defaulting false means an
author who never adds the field publishes nothing, silently.

Underscore-prefixed paths are excluded at three layers — the mirror, the glob
loader, and `isPostFile()` — so a draft cannot reach the public build even if
one layer is misconfigured.

### Dates and timezones

Obsidian writes naive local timestamps with no offset; GitHub runners are UTC.
The `wallClock` transform in `content.config.ts` interprets them against
`site.timezone`. Both collections use it — a mismatch there is silent and
produces dates that are wrong by exactly the UTC offset.

`post-dates.json` is the durable record, since `src/content/vault/` is wiped by
every mirror. Entries key on path and are recovered by content hash on rename.
Orphans are pruned after a 30-day grace period, which protects the case where an
author moves a post back into `_drafts/` to revise it.

`<LocalTime>` renders the author's zone server-side and rewrites to the reader's
zone with a synchronous `is:inline` script — placed adjacent to the element, so
the original text is never painted. It short-circuits when the zones match.

---

## Scripts

| Script | Runs | Purpose |
| --- | --- | --- |
| `check-config.mjs` | `prebuild` | Validates `bloglide.config.json`, reports all problems at once |
| `apply-dates.mjs` | CI step 4 | Injects dates, maintains and prunes the manifest |
| `filter-by-visibility.mjs` | CI step 5 | Removes gated posts, writes `.bloglide-build.json` |
| `check-build.mjs` | CI step 7 | Compares built output against what should exist |
| `report.mjs` | — | `warn()`, `fail()`, `parseFrontmatter()` |
| `paths.mjs` | — | `isPostFile()` — shared by both filtering scripts |
| `slug.mjs` | — | `slugifyPath()`, diagnostics only, never used to build URLs |

### Annotations

`warn()` and `fail()` emit GitHub Actions annotations in CI and plain text
locally. Two details are easy to get wrong and both were: the directive must
**start a line**, so a leading `\n` is required when other output may be
mid-line; and annotations are single-line, so newlines must be percent-encoded
as `%0A` (escaping `%` first).

### The smoke test

`check-build.mjs` exists because Astro can exit 0 while emitting a broken site.
It has caught this twice in development: a slug collision that dropped a post,
and a filter bug that deleted every post.

It reads expected posts from `.bloglide-build.json`, written **before** the
filter deletes anything. An earlier version walked the vault after filtering and
passed vacuously when the filter removed everything — zero files producing zero
pages looked perfectly consistent. A check whose expected value is derived
downstream of the thing it checks can only confirm the pipeline agrees with
itself.

Diagnosis is per-slug rather than by count, so a collision names every file
involved and a post that failed to build names the file and the URL it should
have had.

---

## Conventions and gotchas

**Base paths.** Never hardcode a URL. `href()` in `src/lib/paths.ts` joins the
base correctly regardless of trailing slashes. `import.meta.env.BASE_URL` does
*not* carry a trailing slash, and string concatenation silently produces
`/bloglide-siteposts/`.

**`import.meta.glob` needs literals.** The hero image lookup in
`[...slug].astro` has the vault path written out on both sides. Vite resolves it
at build time and cannot follow a variable, so renaming the content directory
means editing those strings by hand.

**Obsidian tags are not Bloglide topics.** Obsidian's `tags` property forbids
spaces and most punctuation. Bloglide uses `topics` so authors keep a private
organisational layer that never reaches readers, and so topic names can be
free-form. Topic slugs normalise through `slugifyTopic()`, with a developer-owned
`SLUG_OVERRIDES` map for cases the algorithm cannot separate (`C#` and `C++`
both reduce to `c`). Collisions between genuinely distinct topics warn at build
time; collisions that are only case or whitespace differences are the intended
merge and stay silent.

**Display names.** When several spellings merge to one slug, the most frequent
wins with an alphabetical tie-break. The tie-break keeps builds deterministic —
without it, display names could change between builds and produce spurious
diffs.

**Astro 7 uses Sätteri** as its default Markdown processor. remark plugins
require `@astrojs/markdown-remark` and the explicit `processor: unified({...})`
form. Worth revisiting once the plugin ecosystem catches up.

**XSLT is being removed from browsers** (Chrome 158, November 2026), so the feed
has no stylesheet. `/subscribe` is an ordinary HTML page instead, which serves
non-technical readers better anyway.

**`.obsidian/` is deny-then-allow.** `.obsidian/*` followed by negations for the
four config files that ship. A trailing slash on the first line would stop git
descending into the directory and the negations would never match. The plugin
directory is excluded because Obsidian Git stores the mobile PAT in
`plugins/obsidian-git/data.json`.

**Tracking `.obsidian/app.json` has a cost.** Settings changes on either device
dirty the repository, and simultaneous changes on both produce a conflict on a
device with no usable conflict resolution. Mobile auto-sync mitigates it. The
documented recovery is to delete the vault and re-clone.

---

## Local development

```bash
npm install
npm run dev
```

`apply-dates.mjs` and `filter-by-visibility.mjs` do not run locally, which means
two deliberate differences:

- posts have no `pubDate` — `sortByPubDate()` treats undated posts as newest
- gated posts **are** visible, which is why the RSS route filters by visibility
  again even though the pipeline already did

```bash
npm run check          # astro check
npm run format         # prettier
npm run check:config   # validate bloglide.config.json
```

---

## The ID salt

Salts are **derived, never stored**:

```
salt = base64url( HMAC-SHA256( masterKey[version], "<version>:<blogId>" ) )
```

The master key lives only in the operator's `bloglide-cli` tooling. It must
never appear in an author repository, an Actions secret, or a Fly.io
environment — one copy there would let any author derive every other author's
salt. See `bloglide-cli/README.md` for recovery and rotation.

---

## Roadmap

| Stage | Status |
| --- | --- |
| 1. Public posts, pipeline, Tailwind, config layer | done |
| 2. Content tagging | done |
| 3. Obsidian vault + Git | done |
| 4. RSS, styling, accessibility, error handling, docs, clone trial | in progress |
| 5. Private posts | not started |
| 6. Friends posts | not started |
| 7. Comments and replies | not started |
| 8. Theming | not started |

### Decisions already made for later stages

**Authentication** needs same-site cookies, which needs the site and API under
one registrable domain. A `bloglide.com` umbrella with per-author subdomains
(`author.bloglide.com` + `api.bloglide.com`) removes the need for authors to
register their own domain. An author who prefers a custom domain needs both
sides under it.

**One Fly.io instance serves all blogs.** Every backend query must therefore be
scoped by `blogId` — a missing filter is a cross-author data leak, not a bug in
one blog. Enforce it structurally rather than by convention.

**Gated posts** use a single catch-all route with a base58 ID in the URL
fragment, so the public build reveals neither the existence nor the count of
gated posts. IDs derive from `HMAC(slug, salt)` — deterministic, so links
survive edits.

**Friends feeds** are `/feed/{token}.xml`, served by the backend with a
per-friend revocable token. `/rss.xml` never changes, so existing subscribers
are unaffected.

**Comments** are flat with a nullable `in_reply_to`. Nested rendering later is a
view change, not a migration.
