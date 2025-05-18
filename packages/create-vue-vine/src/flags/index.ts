import type { ProjectOptions } from '../create'
import type { FeatureFlag, FeatureFlagActionCtx } from '../utils'
import { confirm, defineFlagMeta, select } from '../utils'

const router: FeatureFlag<'router', {
  readonly type: BooleanConstructor
  readonly description: 'Add Vue Router'
  readonly default: true
}> = defineFlagMeta({
  name: 'router',
  message: 'Use Vue Router?',
  flag: {
    type: Boolean,
    description: 'Add Vue Router',
    default: true,
  } as const,
  initialValue: true,
})
const store: FeatureFlag<'store', {
  readonly type: BooleanConstructor
  readonly description: 'Add Pinia'
  readonly default: true
}> = defineFlagMeta({
  name: 'store',
  message: 'Use Pinia as state management?',
  flag: {
    type: Boolean,
    description: 'Add Pinia',
    default: true,
  } as const,
  initialValue: true,
})
const install: FeatureFlag<'install', {
  readonly type: BooleanConstructor
  readonly description: 'Install dependencies'
  readonly alias: 'i'
  readonly default: false
}> = defineFlagMeta({
  name: 'install',
  message: 'Install all dependencies for the project now?',
  flag: {
    type: Boolean,
    description: 'Install dependencies',
    alias: 'i',
    default: false,
  },
  initialValue: false,
})

const metas: {
  router: typeof router
  store: typeof store
  install: typeof install
} = {
  router,
  store,
  install,
} as const

type Flags = {
  [K in keyof typeof metas]: typeof metas[K]['flag']
}
const flags: Flags = Object.entries(metas).reduce((acc, [key, value]) => {
  Reflect.set(acc, key, value.flag)
  return acc
}, {} as Flags)

type MetaKeys = keyof typeof metas

export type ParsedFlags = {
  [K in MetaKeys]: boolean
}

export function useFlags(): {
  flags: typeof flags
  executeFlags: (flags: ParsedFlags, options: ProjectOptions) => Promise<void>
} {
  return {
    flags,
    executeFlags: async (flags: ParsedFlags, options: ProjectOptions) => {
      const context: FeatureFlagActionCtx = {
        template: (...path) => {
          options.templates.push(...path)
        },
      }

      const css = await select({
        message: 'Using atomized css?',
        options: [
          { value: 'unocss', label: 'UnoCSS' },
          { value: 'tailwind', label: 'Tailwind' },
          { value: 'no', label: 'No' },
        ],
      })

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

      if (css !== 'no') {
        context.template(`code/css/${css}`)
      }
      else {
        context.template('code/css/base')
      }
    },
  }
}
