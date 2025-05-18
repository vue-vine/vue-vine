import type { ConfirmOptions, SelectOptions, TextOptions } from '@clack/prompts'
import process from 'node:process'
import {
  cancel as _cancel,
  confirm as _confirm,
  select as _select,
  text as _text,
  isCancel,
} from '@clack/prompts'

export function cancel(...args: Parameters<typeof _cancel>): never {
  _cancel(...args)
  process.exit(0)
}

function wrapClack<T extends (...args: any[]) => any>(fn: T) {
  return async (...args: Parameters<T>): Promise<Exclude<Awaited<ReturnType<T>>, symbol>> => {
    const result = await fn(...args)
    if (isCancel(result)) {
      cancel('Operation cancelled. Goodbye!')
    }
    return result as Exclude<Awaited<ReturnType<T>>, symbol>
  }
}

export const text: (opts: TextOptions) => Promise<string> = wrapClack(_text)
export const select: (opts: SelectOptions<unknown>) => Promise<unknown> = wrapClack(_select)
export const confirm: (opts: ConfirmOptions) => Promise<boolean> = wrapClack(_confirm)
