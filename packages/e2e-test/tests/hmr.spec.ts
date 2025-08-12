import { afterEach, describe, expect, it } from 'vitest'
import { createBrowserCtxEnvironment, createEvaluator, createFile, deleteFile, editFile, untilUpdated, wait } from '../utils/test-utils'

afterEach(() => {
  // reset existing files
  editFile(
    'hmr.vine.ts',
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
      .replace(':z-index="6"', ':z-index="12"')
      // Restore changes made by new file test
      .replace(/\nimport \{ NewTestComponent \} from '\.\/new-component\.vine'/, '')
      .replace(/\n {4}<NewTestComponent \/>/, ''),
  )

  // clean up any test files that may have been created
  deleteFile('new-component.vine.ts')
})

describe('hmr', () => {
  const createHmrEnvironment = (
    runner: Parameters<typeof createBrowserCtxEnvironment>[0],
  ) => createBrowserCtxEnvironment(async (browserCtx) => {
    await wait(100)
    await runner(browserCtx)
  }, {
    targetRoute: '/hmr',
  })

  it('should update style and preserve state when style is edited', createHmrEnvironment(async (browserCtx) => {
    const evaluator = createEvaluator(browserCtx)
    expect(await evaluator.getColor('button.test-btn')).toBe('rgb(0, 0, 0)')
    await untilUpdated(
      () => evaluator.getTextContent('.counter'),
      'Count: 0',
    )
    await browserCtx.page?.click('button.test-btn')
    await untilUpdated(
      () => evaluator.getTextContent('.counter'),
      'Count: 2',
    )

    await wait(500)
    editFile('hmr.vine.ts', code => code.replace('color: black', 'color: blue'))
    await untilUpdated(() => evaluator.getColor('button.test-btn'), 'rgb(0, 0, 255)')
    await untilUpdated(() => evaluator.getTextContent('.counter'), 'Count: 2')
  }))

  it('should re-render and preserve state when template is edited', createHmrEnvironment(async (browserCtx) => {
    const evaluator = createEvaluator(browserCtx)
    expect(await evaluator.getTextContent('.counter')).toBe('Count: 0')
    await browserCtx.page?.click('button.test-btn')
    await untilUpdated(() => evaluator.getTextContent('.counter'), 'Count: 2')

    await wait(500)
    editFile('hmr.vine.ts', code => code.replace('text111', 'text222'))
    await untilUpdated(() => evaluator.getTextContent('.text-for-replace'), 'text222')
    await untilUpdated(() => evaluator.getTextContent('.counter'), 'Count: 2')
  }))

  it('should re-render and preserve state after element tag has changed', createHmrEnvironment(async (browserCtx) => {
    const evaluator = createEvaluator(browserCtx)
    expect(await evaluator.getTextContent('.counter')).toBe('Count: 0')
    await browserCtx.page?.click('button.test-btn')
    await untilUpdated(() => evaluator.getTextContent('.counter'), 'Count: 2')

    await wait(500)
    editFile('hmr.vine.ts', code =>
      code.replace(
        '<div class="name">{{ name }}</div>',
        '<span class="name">{{ name }}</span>',
      ))
    await untilUpdated(() => evaluator.getTextContent('span.name'), 'vine')
    await untilUpdated(() => evaluator.getTextContent('.counter'), 'Count: 2')
  }))

  it('should reload and reset state when script is edited', createHmrEnvironment(async (browserCtx) => {
    const evaluator = createEvaluator(browserCtx)
    expect(await evaluator.getTextContent('.counter')).toBe('Count: 0')
    await browserCtx.page?.click('button.test-btn')
    await untilUpdated(() => evaluator.getTextContent('.counter'), 'Count: 2')
    editFile('hmr.vine.ts', code => code.replace('ref(\'vine\')', 'ref(\'vue\')'))

    await wait(500)
    await untilUpdated(() => evaluator.getTextContent('.name'), 'vue')
    expect(await evaluator.getTextContent('.counter')).toBe('Count: 0')
  }))

  it('should display correct props when changing component function name', createHmrEnvironment(async (browserCtx) => {
    const evaluator = createEvaluator(browserCtx)
    expect(await evaluator.getTextContent('.test-ts-morph')).toBe('foo: 123')
    editFile(
      'hmr.vine.ts',
      code => (
        code
          .replace('<TestTsMorph', '<TestTsMorph1')
          .replace('function TestTsMorph', 'function TestTsMorph1')
      ),
    )
    await untilUpdated(() => evaluator.getTextContent('.test-ts-morph'), 'foo: 123')
  }))

  it('should update complex type annotation props', createHmrEnvironment(async (browserCtx) => {
    const evaluator = createEvaluator(browserCtx)
    expect(await evaluator.getTextContent('.test-complex-ts-morph h4')).toBe('This is a complex ts-morph example')

    // Component should be hidden by v-show = false
    // div.test-complex-ts-morph should have style display: none
    editFile('hmr.vine.ts', code => code.replace(':z-index="12"', ':z-index="6"'))
    await untilUpdated(() => evaluator.getDisplayStyle('.test-complex-ts-morph'), 'none')
  }))

  it('should handle HMR when creating new vine file (ts-morph scenario)', createHmrEnvironment(async (browserCtx) => {
    const evaluator = createEvaluator(browserCtx)

    // Verify initial state is normal
    expect(await evaluator.getTextContent('.counter')).toBe('Count: 0')

    // Create a new vine file
    const newFileContent = `import { ref } from 'vue'

export function NewTestComponent() {
  const message = ref('Hello from new component!')

  return vine\`
    <div class="new-test-component">
      <p>{{ message }}</p>
    </div>
  \`
}`

    // Create the new file
    createFile('new-component.vine.ts', newFileContent)

    // Modify main file to import and use new component
    editFile('hmr.vine.ts', (code) => {
      return code
        .replace(
          'import { computed, ref } from \'vue\'',
          'import { computed, ref } from \'vue\'\nimport { NewTestComponent } from \'./new-component.vine\'',
        )
        .replace(
          '<TestComplexTsMorph :z-index="12" :content :rotate="0" :gap="[10, 10]" />',
          '<TestComplexTsMorph :z-index="12" :content :rotate="0" :gap="[10, 10]" />\n    <NewTestComponent />',
        )
    })

    // Wait for HMR to complete and component to render
    await wait(1000)

    // Use untilUpdated to wait for the component to appear
    await untilUpdated(
      () => evaluator.getTextContent('.new-test-component p'),
      'Hello from new component!',
    )

    // Verify original state is maintained
    expect(await evaluator.getTextContent('.counter')).toBe('Count: 0')

    // Test HMR updates on the new file
    editFile('new-component.vine.ts', code =>
      code.replace('Hello from new component!', 'Updated message from HMR!'))

    await wait(500)
    await untilUpdated(() => evaluator.getTextContent('.new-test-component p'), 'Updated message from HMR!')
  }))
})
