import type { ParserOptions } from '@babel/parser'
import type { VineBabelRoot } from '../types'
import { parse } from '@babel/parser'

export function babelParse(code: string, options: ParserOptions = {}): VineBabelRoot {
  const finalOptions: ParserOptions = {
    sourceType: 'module',
    plugins: ['typescript'],
    errorRecovery: true,
    ...options,
  }
  try {
    return parse(code, finalOptions)
  }
  catch {
    return parse('', finalOptions)
  }
}
