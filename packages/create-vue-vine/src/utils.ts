import { basename } from 'node:path'
import { cancel as _cancel, text as _text, isCancel } from '@clack/prompts'

export function cancel(...args: Parameters<typeof _cancel>) {
  _cancel(...args)
  process.exit(0)
}

function wrapClack<T extends (...args: any[]) => any>(fn: T) {
  return async (...args: Parameters<T>) => {
    const result = await fn(...args)
    if (isCancel(result)) {
      cancel('Operation cancelled. Goodbye!')
      process.exit(0)
    }
    return result as Exclude<Awaited<ReturnType<T>>, symbol>
  }
}

export const text = wrapClack(_text)

export function validateProjectName(path: string) {
  return basename(path) === path
}
