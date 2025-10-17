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
  readonly default: true
}> = defineFlagMeta({
  name: 'install',
  message: 'Install all dependencies for the project now?',
  flag: {
    type: Boolean,
    description: 'Install dependencies',
    alias: 'i',
    default: true,
  },
  initialValue: true,
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

      // Select build tool
      const buildTool = await select({
        message: 'Choose your build tool:',
        options: [
          { value: 'vite', label: 'Vite (Recommended)' },
          { value: 'rsbuild', label: 'Rsbuild (Beta)' },
        ],
        initialValue: 'vite',
      })
      options.buildTool = buildTool as 'vite' | 'rsbuild'

      // Initialize built-in templates first (base files that can be overridden by features)
      const { initBuiltInTemplates } = await import('../create')
      initBuiltInTemplates(options)

      // Select CSS framework
      const css = await select({
        message: 'Using atomized css?',
        options: [
          { value: 'unocss', label: 'UnoCSS' },
          { value: 'tailwind', label: 'Tailwind' },
          { value: 'no', label: 'No' },
        ],
      })

      // Confirm features
      for (const key in metas) {
        const metaKey = key as MetaKeys
        const { initialValue, message } = metas[metaKey]

        flags[metaKey] = await confirm({
          message,
          initialValue,
        })
      }

      // Add router templates
      if (flags.router) {
        context.template('shared/features/router', 'shared/config/router')
      }

      // Add store templates
      if (flags.store) {
        context.template('shared/features/store/common', 'shared/config/pinia')

        if (flags.router) {
          context.template('shared/features/store/with-router')
        }
        else {
          context.template('shared/features/store/base')
        }
      }

      // Add CSS templates
      if (css !== 'no') {
        context.template(`shared/features/css/${css}`)
        context.template(`${buildTool}/${css}`)
      }
      else {
        context.template('shared/features/css/base')
      }
    },
  }
}
