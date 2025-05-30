import type { Browser, BrowserContext, Page } from 'playwright-chromium'
import type { ViteDevServer } from 'vite'

export type Nil = null | undefined

export interface E2EPlaywrightContext {
  browser: Browser | undefined
  browserCtx: BrowserContext | undefined
  page: Page | undefined
  viteServer: ViteDevServer | undefined
  viteTestUrl: string
  targetRoute?: string
}

export interface Evaluator {
  getTextContent: (selector: string, page?: Page) => Promise<string | Nil>
  getColor: (selector: string, page?: Page) => Promise<string | Nil>
  getDisplayStyle: (selector: string, page?: Page) => Promise<string | Nil>
  getAssetUrl: (selector: string, page?: Page) => Promise<string | Nil>
  getJustifyContent: (selector: string, page?: Page) => Promise<string | Nil>
}

export type EvaluateType =
  | 'style'
  | 'attribute'
  | 'textContent'
