import path from 'node:path'
import fs from 'node:fs'
import { expect } from 'vitest'
import type { Page } from 'playwright-chromium'
import { e2eTestCtx } from './vitest-setup'

type Nil = null | undefined

const timeout = (n: number) => new Promise(resolve => setTimeout(resolve, n))

export function editFile(
  filename: string,
  replacer: (str: string) => string,
): void {
  filename = path.resolve('./src', filename)
  const content = fs.readFileSync(filename, 'utf-8')
  const modified = replacer(content)
  fs.writeFileSync(filename, modified)
}

export async function untilUpdated(
  poll: (page: Page | undefined) => Promise<string | Nil>,
  expected: string,
): Promise<void> {
  await e2eTestCtx.page?.waitForNavigation()
  // After navigation, page context need to be reload from browser context
  const currentPages = await e2eTestCtx.browserCtx?.pages()
  const page = currentPages?.[0]
  e2eTestCtx.page = page
  const maxTries = process.env.CI ? 200 : 50
  for (let tries = 0; tries < maxTries; tries++) {
    const actual = (await poll(page)) ?? ''
    if (actual.includes(expected) || tries === maxTries - 1) {
      expect(actual).toMatch(expected)
      break
    }
    else {
      await timeout(50)
    }
  }
}

export async function getColor(
  selector: string,
  page?: Page,
) {
  const pageCtx = page ?? e2eTestCtx.page
  return await pageCtx?.$eval(selector, el => getComputedStyle(el).color)
}
