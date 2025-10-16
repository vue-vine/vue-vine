import { afterEach, describe, expect, it } from 'vitest'
import {
  createBrowserContext,
  createBrowserCtxEnvironment,
  createEvaluator,
  createFile,
  deleteFile,
  editFile,
  runTestAtPage,
  untilUpdated,
  wait,
} from '../utils/test-utils'

describe('basic functionality', async () => {
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

  it('should transform bare attr as bool', runTestAtPage(
    '/boolean-cast',
    browserCtx,
    async () => {
      expect(await evaluator.getTextContent('.positive .aaa')).toBe('aaa = true (boolean)')
      expect(await evaluator.getTextContent('.positive .bbb')).toBe('bbb = true (boolean)')
      expect(await evaluator.getTextContent('.positive .ccc')).toBe('ccc = true (boolean)')

      expect(await evaluator.getTextContent('.negative .aaa')).toBe('aaa = false (boolean)')
      expect(await evaluator.getTextContent('.negative .bbb')).toBe('bbb = false (boolean)')
      expect(await evaluator.getTextContent('.negative .ccc')).toBe('ccc = false (boolean)')
    },
  ))

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

  it('should report console warning by validators', async () => {
    // Collect console warnings
    const consoleWarnings: string[] = []
    browserCtx.page!.on('console', (msg) => {
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text())
      }
    })

    await runTestAtPage(
      '/vine-validators',
      browserCtx,
      async () => {
        // Check that we got console warnings from validators
        expect(consoleWarnings.length).toMatchInlineSnapshot(`4`)

        // Check for specific validation warnings
        const warningText = consoleWarnings.join('\n')
        expect(warningText).toMatchInlineSnapshot(`
          "[Vue warn]: Invalid prop: custom validator check failed for prop "foo".
            at <ChildCompOne foo="hello" bar=5 >
            at <TestVineValidatorsPage onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref< undefined > >
            at <RouterView>
            at <App>
          [Vue warn]: Invalid prop: custom validator check failed for prop "bar".
            at <ChildCompOne foo="hello" bar=5 >
            at <TestVineValidatorsPage onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref< undefined > >
            at <RouterView>
            at <App>
          [Vue warn]: Invalid prop: custom validator check failed for prop "zig".
            at <ChildCompTwo zig="world" zag=6 >
            at <TestVineValidatorsPage onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref< undefined > >
            at <RouterView>
            at <App>
          [Vue warn]: Invalid prop: custom validator check failed for prop "zag".
            at <ChildCompTwo zig="world" zag=6 >
            at <TestVineValidatorsPage onVnodeUnmounted=fn<onVnodeUnmounted> ref=Ref< undefined > >
            at <RouterView>
            at <App>"
        `)
      },
    )
  })

  it('should be able to mix vine and jsx', runTestAtPage(
    '/mix-with-jsx',
    browserCtx,
    async () => {
      expect(await evaluator.getTextContent('.jsx-comp-name')).toBe('Name:John')
      expect(await evaluator.getTextContent('.jsx-comp-age')).toBe('Age:20')
      expect(await evaluator.getTextContent('.vine-comp-foo')).toBe('props.foo: 111')
      expect(await evaluator.getTextContent('.vine-comp-msg')).toBe('Hello, world!')

      await browserCtx.page?.fill('.vine-comp-input', 'msg changed')
      expect(await evaluator.getTextContent('.vine-comp-msg')).toBe('msg changed')
    },
  ))

  it('should be able to use ts-morph to analyze complex external type', runTestAtPage(
    '/ts-morph-complex-external',
    browserCtx,
    async () => {
      expect(await evaluator.getTextContent('.test-props-destruct .step')).toBe('Step: 3')

      expect(await evaluator.getTextContent('.test-ts-morph-child:nth-child(1) .title')).toBe('Title: hello')
      expect(await evaluator.getTextContent('.test-ts-morph-child:nth-child(1) .message')).toBe('message: Hello, world!')
      expect(await evaluator.getTextContent('.test-ts-morph-child:nth-child(2) .title')).toBe('Title: error')
      expect(await evaluator.getTextContent('.test-ts-morph-child:nth-child(2) .error-code')).toBe('err code: 404')
    },
  ))

  it('should support various kinds of props type declaration', runTestAtPage(
    '/vine-prop',
    browserCtx,
    async () => {
      expect(await evaluator.getTextContent('.child-comp p:nth-child(1)')).toBe('prop1: hello')
      expect(await evaluator.getTextContent('.child-comp p:nth-child(2)')).toBe('prop2: world')
      expect(await evaluator.getTextContent('.child-comp p:nth-child(3)')).toBe('prop3: false')
      expect(await evaluator.getTextContent('.child-comp p:nth-child(4)')).toBe('prop4: true')
      expect(await evaluator.getTextContent('.child-comp p:nth-child(5)')).toBe('prop5: true')
      expect(await evaluator.getTextContent('.child-comp p:nth-child(6)')).toBe('typeof prop6: boolean')
    },
  ))

  it('should support vineEmits', runTestAtPage(
    '/vine-emits',
    browserCtx,
    async () => {
      expect(await evaluator.getTextContent('.result')).toBe('count: 0')

      await browserCtx.page?.click('.emits-defined-by-types')
      expect(await evaluator.getTextContent('.result')).toBe('count: 1')

      await browserCtx.page?.click('.emits-defined-by-names')
      expect(await evaluator.getTextContent('.result')).toBe('count: 2')
    },
  ))

  it('should support vineSlots different use cases', runTestAtPage(
    '/vine-slots',
    browserCtx,
    async () => {
      // default slot
      expect(await evaluator.getTextContent('.default-slot .custom-content')).toBe('Hello from slot content!')

      // named slots
      expect(await evaluator.getTextContent('.named-slots .slot-section.header .custom-content')).toMatchInlineSnapshot(`"This is the header content"`)
      expect(await evaluator.getTextContent('.named-slots .slot-section.default .custom-content')).toMatchInlineSnapshot(`"This is the default slot content"`)
      expect(await evaluator.getTextContent('.named-slots .slot-section.footer .custom-content')).toMatchInlineSnapshot(`"This is the footer content"`)

      // scoped slots
      expect(await evaluator.getTextContent('.scoped-slots .item-list:nth-child(2)')).toMatchInlineSnapshot(`"1. Apple1.5"`)
      expect(await evaluator.getTextContent('.scoped-slots .item-list:nth-child(3)')).toMatchInlineSnapshot(`"2. Banana0.8"`)
      expect(await evaluator.getTextContent('.scoped-slots .item-list:nth-child(4)')).toMatchInlineSnapshot(`"3. Orange2"`)

      // slot with fallback
      expect(await evaluator.getTextContent('.slot-with-fallback .slot-with-fallback-wrapper:nth-child(2) .custom-content')).toMatchInlineSnapshot(`"Custom content provided!"`)
      expect(await evaluator.getTextContent('.slot-with-fallback .slot-with-fallback-wrapper:nth-child(3) .fallback')).toMatchInlineSnapshot(`"This is fallback content when no slot is provided"`)
    },
  ))

  it('should support vineCustomElement', runTestAtPage(
    '/custom-elements',
    browserCtx,
    async () => {
      const sampleCustomElement = await browserCtx.page?.locator('vi-sample-custom-element')
      expect(sampleCustomElement).toBeDefined()

      // Find .text-content in shadow DOM
      expect(await sampleCustomElement?.locator('.text-content').textContent()).toMatchInlineSnapshot(`"Count: 0"`)

      // Find .add-count-btn in shadow DOM
      const addCountBtn = await sampleCustomElement?.locator('.add-count-btn')
      expect(addCountBtn).toBeDefined()

      // Click the button
      await addCountBtn?.click()
      expect(await sampleCustomElement?.locator('.text-content').textContent()).toMatchInlineSnapshot(`"Count: 1"`)
    },
  ))

  it(
    'should work correctly in todo list page',
    runTestAtPage(
      '/todo-list',
      browserCtx,
      async () => {
        // Clear localStorage before test
        await browserCtx.page?.evaluate(() => {
          localStorage.clear()
          location.reload()
        })
        await wait(1000)

        // Helper: Add todo item
        const addTodo = async (text: string) => {
          await evaluator.inputText('.todo-input', text)
          await evaluator.click('.todo-add-btn')
          await wait(300)
        }

        // Helper: Get task count
        const getTaskCount = async () => {
          return await browserCtx.page?.evaluate(() => {
            const tasksSection = document.querySelector('.todo-content:first-of-type')
            return tasksSection?.querySelectorAll('.todo-item').length || 0
          })
        }

        // Helper: Get handled count
        const getHandledCount = async () => {
          return await browserCtx.page?.evaluate(() => {
            const handledSection = document.querySelector('.todo-content:last-of-type')
            return handledSection?.querySelectorAll('.todo-item').length || 0
          })
        }

        // Helper: Click action button using JS (due to visibility issues)
        const clickActionButton = async (selector: string) => {
          await browserCtx.page?.evaluate((sel) => {
            const btn = document.querySelector(sel) as HTMLElement
            btn?.click()
          }, selector)
          await wait(500)
        }

        expect(await getTaskCount()).toBe(0)

        await addTodo('todo test 1')
        expect(await getTaskCount()).toBe(1)

        await addTodo('todo test 2')
        await addTodo('todo test 3')
        await addTodo('todo test 4')
        expect(await getTaskCount()).toBe(4)

        // Complete and delete todos
        await clickActionButton('.todo-content:first-of-type .todo-item:nth-child(2) .todo-complete-btn')
        expect(await getTaskCount()).toBe(3)
        expect(await getHandledCount()).toBe(1)

        await clickActionButton('.todo-content:last-of-type .todo-item .todo-delete-btn')
        expect(await getTaskCount()).toBe(3)
        expect(await getHandledCount()).toBe(0)

        await clickActionButton('.todo-content:first-of-type .todo-item:nth-child(2) .todo-complete-btn')
        expect(await getTaskCount()).toBe(2)
        expect(await getHandledCount()).toBe(1)

        await clickActionButton('.todo-content:last-of-type .todo-item .todo-delete-btn')
        expect(await getTaskCount()).toBe(2)
        expect(await getHandledCount()).toBe(0)

        await clickActionButton('.todo-content:first-of-type .todo-item:nth-child(2) .todo-cancel-btn')
        expect(await getTaskCount()).toBe(1)
        expect(await getHandledCount()).toBe(1)
      },
    ),
  )
})

describe('hmr', () => {
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

    // Force garbage collection after each test
    if (globalThis.gc)
      globalThis.gc()
  })

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
