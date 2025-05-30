import type { E2EPlaywrightContext } from '../utils/types'
import { describe, expect, it } from 'vitest'
import { createBrowserContext, createEvaluator, untilUpdated } from '../utils/test-utils'

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
  const evaluator = createEvaluator(browserCtx)

  it(
    'should be aligned with SFC style order',
    runTestAtPage(
      '/style-order',
      browserCtx,
      async () => {
        expect(await evaluator.getColor('.test-style-order h2.test')).toBe('rgb(255, 0, 0)')
        expect(await evaluator.getColor('.child-comp span.test')).toBe('rgb(255, 0, 0)')
      },
    ),
  )

  it(
    'should apply external imported style',
    runTestAtPage(
      '/external-style-import',
      browserCtx,
      async () => {
        expect(await evaluator.getColor('.container .test-me')).toBe('rgb(0, 0, 0)')
        expect(await evaluator.getColor('.child-comp .test-me')).toBe('rgb(255, 0, 0)')
      },
    ),
  )

  it(
    'should transform asset url',
    runTestAtPage(
      '/transform-asset-url',
      browserCtx,
      async () => {
        expect(await evaluator.getAssetUrl('.test-transform-asset-url img')).toBe('/src/assets/sample.jpg')
      },
    ),
  )

  it(
    'should recongnize props destructure',
    runTestAtPage(
      '/props-destructure',
      browserCtx,
      async () => {
        expect(await evaluator.getTextContent('#item-1')).toBe('foo: hello')
        expect(await evaluator.getTextContent('#item-2')).toBe('bar: 1')
        expect(await evaluator.getTextContent('#item-3')).toBe('other: true')
        expect(await evaluator.getTextContent('#item-4')).toBe('doubleBar: 2')
      },
    ),
  )

  it('should work with vibe', runTestAtPage(
    '/vibe',
    browserCtx,
    async () => {
      expect(await evaluator.getTextContent('.child-comp-1 p')).toBe('Count: 0')
      expect(await evaluator.getTextContent('.child-comp-2 p')).toBe('Data: ')

      await untilUpdated(
        () => evaluator.getTextContent('.child-comp-2 p'),
        'Data: mock data',
      )

      for (let i = 0; i < 10; i++) {
        await browserCtx.page!.click('.child-comp-1 button')
      }
      expect(await evaluator.getTextContent('.child-comp-1 p')).toBe('Count: 10')
    },
  ))

  it('should get correct boolean default', runTestAtPage(
    '/use-defaults',
    browserCtx,
    async () => {
      expect(await evaluator.getJustifyContent('.line-1')).toBe('center')
      expect(await evaluator.getJustifyContent('.line-2')).toBe('center')
    },
  ))

  it('should work with vine model', runTestAtPage(
    '/vine-model',
    browserCtx,
    async () => {
      expect(await evaluator.getTextContent('.simple-msg')).toBe('')
      expect(await evaluator.getTextContent('.special-msg')).toBe('')

      await browserCtx.page?.fill('.simple-input', 'hello')
      await browserCtx.page?.fill('.special-input', 'world')

      expect(await evaluator.getTextContent('.simple-msg')).toBe('hello')
      expect(await evaluator.getTextContent('.special-msg')).toBe('world')
    },
  ))
})
