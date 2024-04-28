import type { FlagOptions } from 'clerc'
import ts from './ts'
import type { ProjectOptions } from '@/create'
import { type FeatureFlagActionCtx, confirm } from '@/utils'

const flags = {
  [ts.name]: ts.flag,
} satisfies Record<string, FlagOptions>

type ParsedFlags = {
  [K in keyof typeof flags]: boolean
}

export function useFlags() {
  return {
    flags,
    executeFlags: async (flags: ParsedFlags, options: ProjectOptions) => {
      const context: FeatureFlagActionCtx = {
        dep: (params) => {
          options.deps.push(params)
        },
        feature: (params) => {
          options.features.push(params)
        },
        source: {
          code: (params) => {
            options.sourceCodes.push(params)
          },
          template: (path) => {
            options.sourceTemplates.push(path)
          },
        },
      }

      // Execute flags, order is sensitive
      for (const item of [ts]) {
        if (!flags[item.name]) {
          flags[item.name] = await confirm({
            message: item.message,
          })
          if (flags[item.name]) {
            item.action(context)
          }
        }
      }
    },
  }
}
