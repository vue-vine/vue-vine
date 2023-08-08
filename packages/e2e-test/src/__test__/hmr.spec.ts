import { afterEach, describe, expect, test } from 'vitest'
import { editFile, getColor, untilUpdated } from '../../utils/test-utils'
import { e2eTestCtx } from '../../utils/vitest-setup'

afterEach(() => {
  // reset
  editFile(
    'test.vine.ts',
    code => code
      .replace('color: blue', 'color: black')
      .replace('text222', 'text111')
      .replace('ref(\'vue\')', 'ref(\'vine\')')
      .replace(
        '<span class="name">{{name}}</span>',
        '<div class="name">{{name}}</div>',
      ),
  )
})
describe('hmr', () => {
  test('should re-render when template is edited', async () => {
    await e2eTestCtx.page?.click('button.test-btn')
    editFile('test.vine.ts', code => code.replace('text111', 'text222'))
    await untilUpdated(() => e2eTestCtx.page!.textContent('.counter'), 'Count: 0')
  })

  test('should update style when style is edited', async () => {
    expect(await getColor('button.test-btn')).toBe('rgb(0, 0, 0)')
    editFile('test.vine.ts', code => code.replace('color: black', 'color: blue'))
    await untilUpdated(page => getColor('button.test-btn', page), 'rgb(0, 0, 255)')
  })

  test('should re-render after element tag has changed', async () => {
    editFile('test.vine.ts', code =>
      code.replace(
        '<div class="name">{{name}}</div>',
        '<span class="name">{{name}}</span>'),
    )
    await untilUpdated(() => e2eTestCtx.page!.textContent('span.name'), 'vine')
  })

  test('should reload and reset state when script is edited', async () => {
    await e2eTestCtx.page?.click('button.test-btn')
    editFile('test.vine.ts', code => code.replace('ref(\'vine\')', 'ref(\'vue\')'))
    await untilUpdated(() => e2eTestCtx.page!.textContent('.name'), 'vue')
    expect(await e2eTestCtx.page!.textContent('.counter')).toBe('Count: 0')
  })
})
