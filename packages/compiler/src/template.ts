import { compile } from '@vue/compiler-dom'
import type { VineTemplateBindings } from './types'

export function compileVineTemplate(
  source: string,
  params: {
    bindingMetadata: VineTemplateBindings
    scopeId: string
  },
) {
  const {
    bindingMetadata,
    scopeId,
  } = params
  return compile(source, {
    mode: 'module',
    hoistStatic: true,
    cacheHandlers: true,
    isTS: true,
    bindingMetadata,
    inline: true,
    scopeId: `data-v-${scopeId}`,
  })
}
