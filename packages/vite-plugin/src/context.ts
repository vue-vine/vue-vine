import type { VinePluginCtx } from './shared'

export const pluginCtx: VinePluginCtx = {
  fileCtxMap: new Map(),
  vineCompileErrors: [],
  vineCompileWarnings: [],
}
