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
  flag: T
  initialValue: boolean
}

export type ParsedFeatureFlag = Record<string, boolean>

export function defineFlagMeta<N extends string, T extends FlagOptions>(flag: FeatureFlag<N, T>) {
  return flag
}
