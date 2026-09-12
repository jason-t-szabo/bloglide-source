const base = import.meta.env.BASE_URL

export function href(path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}
