import type { ProjectOptions } from '@/create'
import type { FeatureFlagActionCtx } from '@/utils'
import { confirm, defineFlagMeta } from '@/utils'

const metas = {
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
  Reflect.set(acc, key, value.flag)
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
        template: (...path) => {
          options.templates.push(...path)
        },
      }

      // Confirm flags, order is sensitive
      for (const item of [metas.router.name]) {
        if (!flags[item]) {
          const { initialValue, message } = metas[item]
          flags[item] = await confirm({
            message,
            initialValue,
          })
        }
      }
      if (flags.router) {
        context.template('code/router', 'config/router')
      }
    },
  }
}
