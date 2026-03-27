const DEBUG = import.meta.env.DEV

export function debug(tag: string, ...args: unknown[]): void {
  if (DEBUG) console.log(`[${tag}]`, ...args)
}
