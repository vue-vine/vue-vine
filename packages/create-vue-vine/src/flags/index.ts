import type { ProjectOptions } from '@/create'
import { confirm, defineFlagMeta } from '@/utils'
import type { FeatureFlagActionCtx } from '@/utils'

const metas = {
  typescript: defineFlagMeta({
    name: 'typescript',
    message: 'Use TypeScript?',
    flag: {
      type: Boolean,
      description: 'Add TypeScript',
      default: false,
    } as const,
    initialValue: true,
  }),
  router: defineFlagMeta({
    name: 'router',
    message: 'Use Vue Router?',
    flag: {
      type: Boolean,
      description: 'Add Vue Router',
      default: false,
    } as const,
    initialValue: false,
  }),
}

const flags = Object.entries(metas).reduce((acc, [key, value]) => {
  // @ts-expect-error - TS doesn't like the computed key
  acc[key] = value.flag
  return acc
}, {} as {
  [K in keyof typeof metas]: typeof metas[K]['flag']
})

export type ParsedFlags = {
  [K in keyof typeof metas]: boolean
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

      // Confirm flags, order is sensitive
      for (const item of [metas.typescript.name, metas.router.name]) {
        if (!flags[item]) {
          const { initialValue, message } = metas[item]
          flags[item] = await confirm({
            message,
            initialValue,
          })
        }
      }

      if (flags.typescript) {
        context.feature({
          name: 'typescript',
          path: 'https://typescriptlang.org',
        })
        context.source.template('ts/main')
      }
      else {
        context.source.template('js/main')
      }
    },
  }
}
