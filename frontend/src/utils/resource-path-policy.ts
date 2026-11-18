export const DEFAULT_BLOCKED_PATHS = ['public', 'public/Models', 'public/Datasets']
export function isBlockedResourcePath(raw: string, blocked: string[]): boolean {
  const segments: string[] = []
  for (const part of raw.replace(/\\/g, '/').split('/')) {
    if (part === '..') segments.pop()
    else if (part && part !== '.') segments.push(part)
  }
  return blocked.includes(segments.join('/'))
}
