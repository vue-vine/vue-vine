import { defineFlag } from '@/utils'

export default defineFlag({
  name: 'typescript' as const,
  message: 'Use TypeScript?',
  flag: {
    type: Boolean,
    description: 'Add TypeScript',
    alias: 't',
    default: false,
  } as const,
  action(ctx) {
    ctx.source.template('ts/main')
  },
})
