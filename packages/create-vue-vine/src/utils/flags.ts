import type { FlagOptions } from 'clerc'
import type { ProjectOptions } from '@/create'

export interface FeatureFlagActionCtx {
  feature: (params: ProjectOptions['features'][number]) => void
  dep: (params: ProjectOptions['deps'][number]) => void
  source: {
    template: (path: string) => void
    code: (params: ProjectOptions['sourceCodes'][number]) => void
  }
}

export interface FeatureFlag<N extends string, T extends FlagOptions> {
  name: N
  message: string
  action: (ctx: FeatureFlagActionCtx) => void
  flag: T
}

export function defineFlag<N extends string, T extends FlagOptions>(flag: FeatureFlag<N, T>) {
  return flag
}
