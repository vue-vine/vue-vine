import { afterAll, afterEach, describe, expect, it } from 'vitest'
import {
  createBrowserContext,
  createEvaluator,
  editFile,
  freeBrowserContext,
  runTestAtPage,
  untilUpdated,
  wait,
} from './utils/test-utils'

describe('hmr test', async () => {
  const browserCtx = await createBrowserContext()
  const evaluator = createEvaluator(browserCtx)

  afterEach(() => {
    // Restore file changes
    editFile(
      'app.vine.ts',
      code => code.replace('color: blue', 'color: brown'),
    )
  })

  // Clean up browser and server after all tests
  afterAll(async () => {
    await freeBrowserContext(browserCtx)
  })

  it(
    'should update style via HMR and preserve state',
    runTestAtPage(
      browserCtx,
      async () => {
        // Step 1: Verify initial state - wait for counter to appear
        await untilUpdated(
          () => evaluator.getTextContent('.counter p'),
          'Count: 0',
        )
        expect(await evaluator.getColor('.title')).toBe('rgb(165, 42, 42)') // brown

        // Step 2: Click increment button 3 times to change state
        await browserCtx.page?.click('button.btn:first-of-type')
        await wait(100)
        await browserCtx.page?.click('button.btn:first-of-type')
        await wait(100)
        await browserCtx.page?.click('button.btn:first-of-type')
        await wait(100)

        // Verify count is 3
        expect(await evaluator.getTextContent('.counter p')).toBe('Count: 3')

        // Step 3: Edit file to trigger HMR - change brown to blue
        editFile('app.vine.ts', code => code.replace('color: brown', 'color: blue'))

        // Step 4: Wait for HMR to update the color
        await untilUpdated(
          () => evaluator.getColor('.title'),
          'rgb(0, 0, 255)', // blue
        )

        // Step 5: Verify state is preserved (count should still be 3)
        expect(await evaluator.getTextContent('.counter p')).toBe('Count: 3')
      },
    ),
  )
})
