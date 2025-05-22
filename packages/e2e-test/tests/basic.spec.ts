import { afterEach, describe, expect, it } from 'vitest'
import {
  createBrowserCtxEnvironment,
  editFile,
  getColor,
  getDisplayStyle,
  untilUpdated,
} from '../utils/test-utils'

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
      )
      .replace(
        '<TestTsMorph1 ',
        '<TestTsMorph ',
      )
      .replace(
        'function TestTsMorph1',
        'function TestTsMorph',
      )
      .replace(':z-index="6"', ':z-index="12"'),
  )
})

describe('hmr', () => {
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

  it('should display correct props when changing component function name', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await browserCtx.page!.textContent('.test-ts-morph')).toBe('foo: 123')
    editFile(
      'test.vine.ts',
      code => (
        code
          .replace('<TestTsMorph', '<TestTsMorph1')
          .replace('function TestTsMorph', 'function TestTsMorph1')
      ),
    )
    await untilUpdated(() => browserCtx.page!.textContent('.test-ts-morph'), 'foo: 123')
  }))
})

describe('ts-morph', () => {
  it('should update complex type annotation props', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await browserCtx.page!.textContent('.test-complex-ts-morph h4')).toBe('This is a complex ts-morph example')

    // Component should be hidden by v-show = false
    // div.test-complex-ts-morph should have style display: none
    editFile('test.vine.ts', code => code.replace(':z-index="12"', ':z-index="6"'))
    await untilUpdated(() => getDisplayStyle(browserCtx, '.test-complex-ts-morph'), 'none')
  }))
})

describe('style-order', () => {
  it('should be aligned with SFC style order', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await getColor(browserCtx, '.test-style-order h2.test')).toBe('rgb(255, 0, 0)')
    expect(await getColor(browserCtx, '.child-comp span.test')).toBe('rgb(255, 0, 0)')
  }, {
    targetRoute: '/style-order',
  }))
})

describe('external-style-import', () => {
  it('should be aligned with SFC style order', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await getColor(browserCtx, '.container .test-me')).toBe('rgb(0, 0, 0)')
    expect(await getColor(browserCtx, '.child-comp .test-me')).toBe('rgb(255, 0, 0)')
  }, {
    targetRoute: '/external-style-import',
  }))
})
