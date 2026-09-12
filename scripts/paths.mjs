export const isPostFile = (entry) =>
  /\.mdx?$/i.test(entry) && !/(^|[/\\])_/.test(entry)