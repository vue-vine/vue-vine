import type { ParserOptions } from '@babel/parser'
import { parse } from '@babel/parser'

export function babelParse(code: string, options: ParserOptions = {}) {
  return parse(code, {
    sourceType: 'module',
    plugins: [
      'typescript',
    ],
    ...options,
  })
}
