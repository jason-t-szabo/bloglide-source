export function warn(message: string): void {
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.log(`::warning title=Bloglide::${message}`)
  } else {
    console.warn(`[bloglide] ${message}`)
  }
}
