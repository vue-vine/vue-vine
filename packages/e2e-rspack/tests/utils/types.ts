import type { ResultPromise } from 'execa'
import type { Browser, Page } from 'playwright-chromium'

export type Nil = null | undefined

export interface E2EPlaywrightContext {
  browser?: Browser
  page?: Page
  rspackServer?: ResultPromise
  rspackServerUrl?: string
}

export type EvaluateType = 'style' | 'attribute' | 'textContent'

export interface Evaluator {
  getTextContent: (selector: string, page?: Page) => Promise<string | Nil>
  getColor: (selector: string, page?: Page) => Promise<string | Nil>
  getAttribute: (selector: string, attribute: string, page?: Page) => Promise<string | Nil>
}
