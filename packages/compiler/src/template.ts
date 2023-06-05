import type { CompilerOptions } from '@vue/compiler-dom'
import { compile } from '@vue/compiler-dom'

export function compileVineTemplate(
  source: string,
  params: Partial<CompilerOptions>,
) {
  return compile(source, {
    mode: 'module',
    hoistStatic: true,
    cacheHandlers: true,
    isTS: true,
    inline: true,
    ...params,
  })
}
