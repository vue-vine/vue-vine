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
      default: true,
    } as const,
    initialValue: true,
  }),
  store: defineFlagMeta({
    name: 'store',
    message: 'Use Pinia as state management?',
    flag: {
      type: Boolean,
      description: 'Add Pinia',
      default: true,
    } as const,
    initialValue: true,
  }),
  css: defineFlagMeta({
    name: 'css',
    message: 'Use Tailwind CSS?',
    flag: {
      type: Boolean,
      description: 'Add TailwindCSS',
      default: true,
    } as const,
    initialValue: true,
  }),
  install: defineFlagMeta({
    name: 'install',
    message: 'Install all dependencies for the project now?',
    flag: {
      type: Boolean,
      description: 'Install dependencies',
      alias: 'i',
      default: false,
    },
    initialValue: false,
  }),
} as const

const flags = Object.entries(metas).reduce((acc, [key, value]) => {
  Reflect.set(acc, key, value.flag)
  return acc
}, {} as {
  [K in MetaKeys]: typeof metas[K]['flag']
})

type MetaKeys = keyof typeof metas

export type ParsedFlags = {
  [K in MetaKeys]: boolean
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

      for (const key in metas) {
        const metaKey = key as MetaKeys
        const { initialValue, message } = metas[metaKey]

        flags[metaKey] = await confirm({
          message,
          initialValue,
        })
      }

      if (flags.router) {
        context.template('code/router', 'config/router')
      }

      if (flags.store) {
        context.template('code/store/common', 'config/pinia')

        if (flags.router) {
          context.template('code/store/with-router')
        }
        else {
          context.template('code/store/base')
        }
      }

      if (flags.css) {
        context.template('code/css/tailwind')
      }
      else {
        context.template('code/css/base')
      }
    },
  }
}
