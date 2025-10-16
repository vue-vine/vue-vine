import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

describe('nuxt module test', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders the index page with Vue Vine component', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/')
    expect(html).toContain(`<div>basic</div>`)
    expect(html).toContain(`<div class="vine-nuxt-module-test"`)
  })

  it('includes component reactive state in SSR', async () => {
    // Verify that the component's initial state is rendered
    const html = await $fetch('/')
    expect(html).toContain('Count: 0')
    expect(html).toContain('class="count"')
  })

  it('includes scoped styles', async () => {
    // Verify that scoped styles are applied (data-v-* attributes)
    const html = await $fetch('/')
    expect(html).toMatch(/data-v-[a-f0-9]+/)
  })
})
