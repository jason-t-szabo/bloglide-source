// plugins/remark-vault-paths.mjs
import path from 'node:path'
import { visit } from 'unist-util-visit'
import { warn } from '../src/lib/warn'

const CONTENT_ROOT = path.resolve('./src/content/vault')

export function remarkVaultPaths() {
  return (tree, file) => {
    const dir = path.dirname(file.path)
    visit(tree, 'image', (node) => {
      const url = decodeURI(node.url)
      if (/^(https?:|\/|\.)/.test(url)) return

      let rel = path.relative(dir, path.join(CONTENT_ROOT, url))
      if (!rel.startsWith('.')) rel = './' + rel
      node.url = rel.split(path.sep).join('/')
      if (!node.alt) warn(`Missing alt text on image with URL ${node.url}.`)
    })
  }
}
