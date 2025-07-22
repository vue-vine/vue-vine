import { describe, expect, it } from 'vitest'
import { createBrowserContext, createEvaluator, runTestAtPage, untilUpdated, wait } from '../utils/test-utils'

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
        expect(await evaluator.getAssetUrl('.test-transform-asset-url img[alt="sample"]')).toBe('/src/assets/sample.jpg')
        expect(await evaluator.getAssetUrl('.test-transform-asset-url img[alt="placeholder"]')).toBe('https://placehold.co/200x100')

        await wait(1000)
        expect(await evaluator.isImageLoaded('.test-transform-asset-url img[alt="sample"]')).toBe(true)
        expect(await evaluator.isImageLoaded('.test-transform-asset-url img[alt="placeholder"]')).toBe(true)
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

  it('should work in vapor interop mode', runTestAtPage(
    '/vapor-interop',
    browserCtx,
    async () => {
      expect(await evaluator.getTextContent('.test-vapor-comp h3')).toBe('Vapor Component in Virtual DOM component')
      expect(await evaluator.getTextContent('.test-vdom-comp h3')).toBe('Virtual DOM Component in Vapor slot')

      await browserCtx.page?.fill('.test-vdom-comp input', 'hello')
      expect(await evaluator.getTextContent('.test-vdom-comp p')).toBe('hello')

      expect(await evaluator.getTextContent('.test-vapor-comp p')).toBe('Count: 0')
      await browserCtx.page?.click('.test-vapor-comp button')
      expect(await evaluator.getTextContent('.test-vapor-comp p')).toBe('Count: 1')

      expect(await evaluator.getTextContent('.test-another-vapor-comp span')).toBe('Another Vapor Component')

      expect(await evaluator.getAssetUrl('img[alt="sample-img-in-vapor-comp"]')).toBe('/src/assets/sample.jpg')
      expect(await evaluator.isImageLoaded('img[alt="sample-img-in-vapor-comp"]')).toBe(true)

      expect(await evaluator.getAssetUrl('img[alt="remote-img-as-placeholder"]')).toBe('https://placehold.co/200x100')
      expect(await evaluator.isImageLoaded('img[alt="remote-img-as-placeholder"]')).toBe(true)
    },
  ))
})
