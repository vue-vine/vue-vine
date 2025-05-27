import { resolve } from 'node:path'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('ssr', async () => {
  await setup({
    rootDir: resolve(import.meta.dirname, './fixtures/basic'),
  })

  it('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/')
    expect(html).toContain(`<div>basic</div>`)
    expect(html).toContain(`<div class="vine-nuxt-module-test"`)
  })
})
