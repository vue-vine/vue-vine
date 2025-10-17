import { afterAll, afterEach, describe, expect, it } from 'vitest'
import {
  createBrowserContext,
  createEvaluator,
  editFile,
  freeBrowserContext,
  runTestAtPage,
  untilUpdated,
} from './utils/test-utils'

describe('e2e test suites', async () => {
  // Shared browser context for all tests
  const browserCtx = await createBrowserContext()
  const evaluator = createEvaluator(browserCtx)

  // Clean up after all tests
  afterAll(async () => {
    await freeBrowserContext(browserCtx)
  })

  describe('asset test', async () => {
    it(
      'should load images correctly',
      { retry: 3 },
      runTestAtPage(
        '/transform-asset-url',
        browserCtx,
        async () => {
          // Wait for page to load
          await untilUpdated(
            () => evaluator.getTextContent('.test-transform-asset-url h2'),
            'Transform Asset URL Test',
          )

          // Verify src attributes are correctly transformed
          const img1Src = await evaluator.getAttribute('.img-list img:nth-of-type(1)', 'src')
          expect(img1Src).not.toContain('@/') // @/ alias should be transformed

          const img2Src = await evaluator.getAttribute('.img-list img:nth-of-type(2)', 'src')
          expect(img2Src).not.toContain('@/') // should also be transformed

          const img3Src = await evaluator.getAttribute('.img-list img:nth-of-type(3)', 'src')
          expect(img3Src).toContain('https://') // external URL should be preserved
        },
      ),
    )
  })

  describe('style test', async () => {
    it(
      'should apply correct style order',
      { retry: 3 },
      runTestAtPage(
        '/style-order',
        browserCtx,
        async () => {
          // Wait for page to load
          await untilUpdated(
            () => evaluator.getTextContent('.test-style-order h2'),
            'Style Order Test',
          )

          // Both outer and inner should be red (parent style overrides child)
          const outerColor = await evaluator.getColor('.test-style-order h3.test')
          expect(outerColor).toBe('rgb(255, 0, 0)') // red

          const innerColor = await evaluator.getColor('.child-comp .test')
          expect(innerColor).toBe('rgb(255, 0, 0)') // red (parent style wins)
        },
      ),
    )

    it(
      'should import external styles with scoped',
      { retry: 3 },
      runTestAtPage(
        '/external-style-import',
        browserCtx,
        async () => {
          // Wait for page to load
          await untilUpdated(
            () => evaluator.getTextContent('.container h2'),
            'External Style Import Test',
          )

          // Outside paragraph should not have red color (no scoped import)
          const outsideColor = await evaluator.getColor('.container > .test-me')
          expect(outsideColor).not.toBe('rgb(255, 0, 0)')

          // Inside paragraph should have red color (scoped import from e2e.css)
          const insideColor = await evaluator.getColor('.child-comp .test-me')
          expect(insideColor).toBe('rgb(255, 0, 0)') // red from e2e.css
        },
      ),
    )
  })

  describe('data show test', async () => {
    it(
      'should display vine prop values correctly',
      { retry: 3 },
      runTestAtPage(
        '/vine-prop',
        browserCtx,
        async () => {
          // Verify prop1 displays the passed string value
          await untilUpdated(
            () => evaluator.getTextContent('.child-comp p:nth-of-type(1)'),
            'prop1: hello',
          )

          // Verify prop2 displays the passed value (overriding default 'bar')
          await untilUpdated(
            () => evaluator.getTextContent('.child-comp p:nth-of-type(2)'),
            'prop2: world',
          )

          // Verify prop3 displays the boolean value false
          await untilUpdated(
            () => evaluator.getTextContent('.child-comp p:nth-of-type(3)'),
            'prop3: false',
          )

          // Verify prop4 displays the boolean value true (overriding default false)
          await untilUpdated(
            () => evaluator.getTextContent('.child-comp p:nth-of-type(4)'),
            'prop4: true',
          )

          // Verify prop5 displays true (boolean attribute)
          await untilUpdated(
            () => evaluator.getTextContent('.child-comp p:nth-of-type(5)'),
            'prop5: true',
          )

          // Verify prop6 typeof shows 'boolean' (mayGetBoolean always returns true)
          await untilUpdated(
            () => evaluator.getTextContent('.child-comp p:nth-of-type(6)'),
            'typeof prop6: boolean',
          )
        },
      ),
    )

    it(
      'should display ts-morph complex types correctly',
      { retry: 3 },
      runTestAtPage(
        '/ts-morph-complex-external',
        browserCtx,
        async () => {
        // Wait for page to load and render
          await untilUpdated(
            () => evaluator.getTextContent('.test-ts-morph-complex-external h2'),
            'Test Ts Morph Complex External',
          )

          // Test first child component (success variant)
          // Verify title
          await untilUpdated(
            () => evaluator.getTextContent('.flex-row .test-ts-morph-child:first-child .title'),
            'Title: hello',
          )
          // Verify variant
          const firstChildVariant = await evaluator.getTextContent('.flex-row .test-ts-morph-child:first-child h4')
          expect(firstChildVariant).toBe('Variant: success')
          // Verify message exists
          const firstChildMessage = await evaluator.getTextContent('.flex-row .test-ts-morph-child:first-child .message')
          expect(firstChildMessage).toBe('message: Hello, world!')

          // Test second child component (error variant)
          // Verify title
          await untilUpdated(
            () => evaluator.getTextContent('.flex-row .test-ts-morph-child:last-child .title'),
            'Title: error',
          )
          // Verify variant
          const secondChildVariant = await evaluator.getTextContent('.flex-row .test-ts-morph-child:last-child h4')
          expect(secondChildVariant).toBe('Variant: error')
          // Verify error code exists
          const secondChildErrorCode = await evaluator.getTextContent('.flex-row .test-ts-morph-child:last-child .error-code')
          expect(secondChildErrorCode).toBe('err code: 404')

          // Test props destruct component with default value
          await untilUpdated(
            () => evaluator.getTextContent('.test-props-destruct h4'),
            'Test props destruct',
          )
          await untilUpdated(
            () => evaluator.getTextContent('.test-props-destruct .step'),
            'Step: 3',
          )
        },
      ),
    )
  })

  describe('hmr test', async () => {
    afterEach(() => {
      // Restore file changes
      editFile(
        'fixtures/hmr.vine.ts',
        code => code.replace('color: blue', 'color: brown'),
      )
    })

    it(
      'should update style via HMR and preserve state',
      runTestAtPage(
        '/hmr',
        browserCtx,
        async () => {
          // Step 1: Verify initial state - wait for counter to appear
          await untilUpdated(
            () => evaluator.getTextContent('.counter p'),
            'Count: 0',
          )
          expect(await evaluator.getColor('.title')).toBe('rgb(165, 42, 42)') // brown

          // Step 2: Click increment button to change state
          await browserCtx.page?.click('button.inc-btn', { clickCount: 3 })
          await untilUpdated(
            () => evaluator.getTextContent('.counter p'),
            'Count: 3',
          )
          expect(await evaluator.getTextContent('.counter p')).toBe('Count: 3')

          // Step 3: Edit file to trigger HMR - change brown to blue
          editFile('fixtures/hmr.vine.ts', code => code.replace('color: brown', 'color: blue'))

          // Step 4: Wait for HMR to update the color (longer timeout for CI)
          await untilUpdated(
            () => evaluator.getColor('.title'),
            'rgb(0, 0, 255)', // blue
          )

          // Step 5: Verify state is preserved (count should still be 3)
          // This is the key test - if HMR works correctly, the state won't reset
          await untilUpdated(
            () => evaluator.getTextContent('.counter p'),
            'Count: 3',
          )
        },
      ),
    )
  })
})
