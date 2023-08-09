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
      .replace('ref(\'vue\')', 'ref(\'vine\')'),
  )
})
describe('hmr', () => {
  test('should update style and preserve state when style is edited', async () => {
    expect(await getColor('button.test-btn')).toBe('rgb(0, 0, 0)')
    await untilUpdated(() => {
      return e2eTestCtx.page!.textContent('.counter')
    }, 'Count: 0')
    await e2eTestCtx.page?.click('button.test-btn')
    await untilUpdated(() => {
      return e2eTestCtx.page!.textContent('.counter')
    }, 'Count: 2')
    editFile('test.vine.ts', code => code.replace('color: black', 'color: blue'))
    await untilUpdated(() => getColor('button.test-btn'), 'rgb(0, 0, 255)')
    await untilUpdated(() => {
      return e2eTestCtx.page!.textContent('.counter')
    }, 'Count: 2')
  })

  // test('should re-render and preserve state when template is edited', async () => {
  //   await e2eTestCtx.page?.click('button.test-btn')
  //   editFile('test.vine.ts', code => code.replace('text111', 'text222'))
  //   await untilUpdated(() => {
  //     return e2eTestCtx.page!.textContent('.counter')
  //   }, 'Count: 0')
  // })

  // test('should re-render after element tag has changed', async () => {
  //   editFile('test.vine.ts', code =>
  //     code.replace(
  //       '<p class="name">{{name}}</p>',
  //       '<span class="name">{{name}}</span>'),
  //   )
  //   await untilUpdated(() => e2eTestCtx.page!.textContent('span.name'), 'vine')
  // })

  // test('should reload and reset state when script is edited', async () => {
  //   await e2eTestCtx.page?.click('button.test-btn')
  //   editFile('test.vine.ts', code => code.replace('ref(\'vine\')', 'ref(\'vue\')'))
  //   await untilUpdated(() => e2eTestCtx.page!.textContent('.name'), 'vue')
  //   expect(await e2eTestCtx.page!.textContent('.counter')).toBe('Count: 0')
  // })
})
