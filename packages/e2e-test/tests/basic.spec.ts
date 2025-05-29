import type { E2EPlaywrightContext } from '../utils/test-utils'
import { describe, expect, it } from 'vitest'
import { createBrowserContext, getAssetUrl, getColor, getJustifyContent, untilUpdated } from '../utils/test-utils'

function runTestAtPage(
  page: string,
  browserCtx: E2EPlaywrightContext,
  testRunner: () => Promise<void>,
) {
  return async () => {
    await browserCtx.page?.goto(`${browserCtx.viteTestUrl}${page}`)
    await testRunner()
  }
}

describe('test basic functionality', async () => {
  const browserCtx = await createBrowserContext()

  it(
    'should be aligned with SFC style order',
    runTestAtPage(
      '/style-order',
      browserCtx,
      async () => {
        expect(await getColor(browserCtx, '.test-style-order h2.test')).toBe('rgb(255, 0, 0)')
        expect(await getColor(browserCtx, '.child-comp span.test')).toBe('rgb(255, 0, 0)')
      },
    ),
  )

  it(
    'should apply external imported style',
    runTestAtPage(
      '/external-style-import',
      browserCtx,
      async () => {
        expect(await getColor(browserCtx, '.container .test-me')).toBe('rgb(0, 0, 0)')
        expect(await getColor(browserCtx, '.child-comp .test-me')).toBe('rgb(255, 0, 0)')
      },
    ),
  )

  it(
    'should transform asset url',
    runTestAtPage(
      '/transform-asset-url',
      browserCtx,
      async () => {
        expect(await getAssetUrl(browserCtx, '.test-transform-asset-url img')).toBe('/src/assets/sample.jpg')
      },
    ),
  )

  it(
    'should recongnize props destructure',
    runTestAtPage(
      '/props-destructure',
      browserCtx,
      async () => {
        expect(await browserCtx.page!.textContent('#item-1')).toBe('foo: hello')
        expect(await browserCtx.page!.textContent('#item-2')).toBe('bar: 1')
        expect(await browserCtx.page!.textContent('#item-3')).toBe('other: true')
        expect(await browserCtx.page!.textContent('#item-4')).toBe('doubleBar: 2')
      },
    ),
  )

  it('should work with vibe', runTestAtPage(
    '/vibe',
    browserCtx,
    async () => {
      expect(await browserCtx.page!.textContent('.child-comp-1 p')).toBe('Count: 0')
      expect(await browserCtx.page!.textContent('.child-comp-2 p')).toBe('Data: ')

      await untilUpdated(
        () => browserCtx.page!.textContent('.child-comp-2 p'),
        'Data: mock data',
      )

      for (let i = 0; i < 10; i++) {
        await browserCtx.page!.click('.child-comp-1 button')
      }
      expect(await browserCtx.page!.textContent('.child-comp-1 p')).toBe('Count: 10')
    },
  ))

  it('should get correct boolean default', runTestAtPage(
    '/use-defaults',
    browserCtx,
    async () => {
      expect(await getJustifyContent(browserCtx, '.line-1')).toBe('center')
      expect(await getJustifyContent(browserCtx, '.line-2')).toBe('center')
    },
  ))
})
