import type { FlagOptions } from 'clerc'

export interface FeatureFlagActionCtx {
  template: (...path: string[]) => void
}

export interface FeatureFlag<N extends string, T extends FlagOptions> {
  name: N
  message: string
  flag: T
  initialValue: boolean
}

export type ParsedFeatureFlag = Record<string, boolean>

export function defineFlagMeta<N extends string, T extends FlagOptions>(flag: FeatureFlag<N, T>): FeatureFlag<N, T> {
  return flag
}
