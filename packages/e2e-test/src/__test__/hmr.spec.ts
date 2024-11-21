import type { E2EPlaywrightContext } from '../../utils/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createBrowserContext, editFile, freeBrowserContext, getColor, untilUpdated } from '../../utils/test-utils'

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
  const createBrowserCtxEnvironment = (
    testRunner: (browserCtx: E2EPlaywrightContext) => Promise<void>,
  ) => {
    return async () => {
      const browserCtx = await createBrowserContext()
      await testRunner(browserCtx)
      freeBrowserContext(browserCtx)
    }
  }

  it('should update style and preserve state when style is edited', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await getColor(browserCtx, 'button.test-btn')).toBe('rgb(0, 0, 0)')
    await untilUpdated(
      () => browserCtx.page!.textContent('.counter'),
      'Count: 0',
    )
    await browserCtx.page?.click('button.test-btn')
    await untilUpdated(
      () => browserCtx.page!.textContent('.counter'),
      'Count: 2',
    )
    editFile('test.vine.ts', code => code.replace('color: black', 'color: blue'))
    await untilUpdated(() => getColor(browserCtx, 'button.test-btn'), 'rgb(0, 0, 255)')
    await untilUpdated(() => browserCtx.page!.textContent('.counter'), 'Count: 2')
  }))

  it('should re-render and preserve state when template is edited', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await browserCtx.page!.textContent('.counter')).toBe('Count: 0')
    await browserCtx.page?.click('button.test-btn')
    await untilUpdated(() => browserCtx.page!.textContent('.counter'), 'Count: 2')
    editFile('test.vine.ts', code => code.replace('text111', 'text222'))
    await untilUpdated(() => browserCtx.page!.textContent('.text-for-replace'), 'text222')
    await untilUpdated(() => browserCtx.page!.textContent('.counter'), 'Count: 2')
  }))

  it('should re-render and preserve state after element tag has changed', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await browserCtx.page!.textContent('.counter')).toBe('Count: 0')
    await browserCtx.page?.click('button.test-btn')
    await untilUpdated(() => browserCtx.page!.textContent('.counter'), 'Count: 2')
    editFile('test.vine.ts', code =>
      code.replace(
        '<div class="name">{{name}}</div>',
        '<span class="name">{{name}}</span>',
      ))
    await untilUpdated(() => browserCtx.page!.textContent('span.name'), 'vine')
    await untilUpdated(() => browserCtx.page!.textContent('.counter'), 'Count: 2')
  }))

  it('should reload and reset state when script is edited', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await browserCtx.page!.textContent('.counter')).toBe('Count: 0')
    await browserCtx.page?.click('button.test-btn')
    await untilUpdated(() => browserCtx.page!.textContent('.counter'), 'Count: 2')
    editFile('test.vine.ts', code => code.replace('ref(\'vine\')', 'ref(\'vue\')'))
    await untilUpdated(() => browserCtx.page!.textContent('.name'), 'vue')
    expect(await browserCtx.page!.textContent('.counter')).toBe('Count: 0')
  }))
})
