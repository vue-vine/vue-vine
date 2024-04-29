import { green } from 'yoctocolors'
import type { ProjectOptions } from '@/create'
import { confirm, defineFlagMeta } from '@/utils'
import type { FeatureFlagActionCtx } from '@/utils'

const metas = {
  typescript: defineFlagMeta({
    name: 'typescript',
    message: `Use TypeScript? ${green('(Recommended)')}`,
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
    initialValue: true,
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
      for (const item of [metas.typescript.name, metas.router.name]) {
        if (!flags[item]) {
          const { initialValue, message } = metas[item]
          flags[item] = await confirm({
            message,
            initialValue,
          })
        }
      }

      let op = 0

      if (flags.typescript) {
        op |= 1
      }
      if (flags.router) {
        op |= 2
      }

      switch (op) {
        case 0:
          context.template('code/js-base')
          break
        case 1:
          context.template('code/ts-base', 'config/ts')
          break
        case 2:
          context.template('code/js-router', 'config/router')
          break
        case 3:
          context.template('code/ts-router', 'config/ts', 'config/router')
          break
      }
    },
  }
}
