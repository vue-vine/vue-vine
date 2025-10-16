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
  getTextContent: (selector: string, page?: Page) => Promise<EvaluateResult>
  getColor: (selector: string, page?: Page) => Promise<EvaluateResult>
  getDisplayStyle: (selector: string, page?: Page) => Promise<EvaluateResult>
  getAssetUrl: (selector: string, page?: Page) => Promise<EvaluateResult>
  getJustifyContent: (selector: string, page?: Page) => Promise<EvaluateResult>
  getElementCount: (selector: string, page?: Page) => Promise<number>
  clearLocalStorage: (page?: Page) => Promise<void>
  inputText: (selector: string, text: string, page?: Page) => Promise<void>
  click: (selector: string, page?: Page) => Promise<void>
  isImageLoaded: (selector: string, page?: Page) => Promise<EvaluateResult>
}

export type EvaluateResult = string | boolean | Nil

export type EvaluateType
  = | 'style'
    | 'attribute'
    | 'textContent'
    | 'isImageLoaded'
