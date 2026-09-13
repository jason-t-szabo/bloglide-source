// plugins/remark-vault-paths.mjs
import path from 'node:path'
import { visit } from 'unist-util-visit'
import { warn } from '../src/lib/warn'
import fs from 'node:fs'

const CONTENT_ROOT = path.resolve('./src/content/vault')

export function remarkVaultPaths() {
  return (tree, file) => {
    const dir = path.dirname(file.path)
    visit(tree, 'image', (node) => {
      const url = decodeURI(node.url)
      if (/^(https?:|\/|\.)/.test(url)) return

      const abs = path.join(CONTENT_ROOT, url)
      if (!fs.existsSync(abs)) {
        warn(
          `Image not found: ${url} in ${path.basename(file.path)}. ` +
            `It was left out of the published post. Check the filename and its capitalization.`
        )
        node.type = 'text'
        node.value = ''
        delete node.url
        delete node.alt
        return
      }

      let rel = path.relative(dir, path.join(CONTENT_ROOT, url))
      if (!rel.startsWith('.')) rel = './' + rel
      node.url = rel.split(path.sep).join('/')
      if (!node.alt) warn(`Missing alt text in file ${file.path} on image with URL ${node.url}.`)
    })
  }
}
