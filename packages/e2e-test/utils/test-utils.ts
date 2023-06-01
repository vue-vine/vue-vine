import path from 'node:path'
import fs from 'node:fs'
import { expect } from 'vitest'
import type { ElementHandle } from 'playwright-chromium'
import { page } from './vitest-setup'

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
  poll: () => Promise<string | null>,
  expected: string,
): Promise<void> {
  const maxTries = process.env.CI ? 200 : 50
  for (let tries = 0; tries < maxTries; tries++) {
    const actual = (await poll()) ?? ''
    if (actual.includes(expected) || tries === maxTries - 1) {
      expect(actual).toMatch(expected)
      break
    }
    else {
      await timeout(50)
    }
  }
}

export async function getColor(el: string | ElementHandle): Promise<string | null> {
  const res = await toEl(el)
  const rgb = res && (await res.evaluate(el => getComputedStyle(el as Element).color))
  return rgb
}

async function toEl(el: string | ElementHandle): Promise<ElementHandle | null> {
  if (typeof el === 'string') {
    const res = await page.$(el)
    return res ?? null
  }
  return el as ElementHandle
}
