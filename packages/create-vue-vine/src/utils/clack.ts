import { cancel as _cancel, confirm as _confirm, text as _text, isCancel } from '@clack/prompts'

export function cancel(...args: Parameters<typeof _cancel>): never {
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
export const confirm = wrapClack(_confirm)
