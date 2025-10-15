import { resolve } from 'node:path'
import { $fetch, createPage, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('nuxt module test', async () => {
  await setup({
    rootDir: resolve(import.meta.dirname, './fixtures/basic'),
    browser: true,
  })

  it('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/')
    expect(html).toContain(`<div>basic</div>`)
    expect(html).toContain(`<div class="vine-nuxt-module-test"`)
  })

  it('should increment and decrement count on button clicks', async () => {
    // Create page using @nuxt/test-utils
    const page = await createPage('/')

    // Wait for the component to render
    await page.waitForSelector('.vine-nuxt-module-test')

    // Check initial count
    const initialText = await page.textContent('.vine-nuxt-module-test .count')
    expect(initialText).toContain('Count: 0')

    // Click increment button
    await page.click('.test-inc-btn')
    await page.waitForTimeout(100)

    // Check count after increment
    let countText = await page.textContent('.vine-nuxt-module-test .count')
    expect(countText).toContain('Count: 1')

    // Click increment button again
    await page.click('.test-inc-btn')
    await page.waitForTimeout(100)

    countText = await page.textContent('.vine-nuxt-module-test .count')
    expect(countText).toContain('Count: 2')

    // Click decrement button
    await page.click('.test-dec-btn')
    await page.waitForTimeout(100)

    countText = await page.textContent('.vine-nuxt-module-test .count')
    expect(countText).toContain('Count: 1')

    // Click decrement button again
    await page.click('.test-dec-btn')
    await page.waitForTimeout(100)

    countText = await page.textContent('.vine-nuxt-module-test .count')
    expect(countText).toContain('Count: 0')

    // Close the page
    await page.close()
  })

  it('should apply v-bind color style', async () => {
    // Create a new page for this test
    const page = await createPage('/')
    await page.waitForSelector('.vine-nuxt-module-test')

    // Check that the color is applied via v-bind
    const color = await page.evaluate(() => {
      const countEl = document.querySelector('.vine-nuxt-module-test .count')
      return countEl ? window.getComputedStyle(countEl).color : null
    })

    // red in RGB is rgb(255, 0, 0)
    expect(color).toBe('rgb(255, 0, 0)')

    // Close the page
    await page.close()
  })
})
