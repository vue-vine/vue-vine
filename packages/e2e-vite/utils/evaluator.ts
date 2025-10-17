import type { Page } from 'playwright-chromium'
import type { E2EPlaywrightContext, EvaluateResult, EvaluateType, Evaluator, Nil } from './types'

/**
 * Generic element property/style/content evaluation function
 * @param page - Playwright page instance
 * @param selector - CSS selector
 * @param evaluationType - Evaluation type
 * @param property - Property name (optional for textContent)
 * @returns Evaluation result
 */
async function evaluateElement(
  page: Page | undefined,
  selector: string,
  evaluationType: EvaluateType,
  property?: string,
): Promise<string | boolean | Nil> {
  if (!page) {
    return null
  }

  return await page.evaluate(
    ({ selector, evaluationType, property }) => {
      const el = document.querySelector(selector)
      if (!el) {
        return null
      }

      switch (evaluationType) {
        case 'style':
          return getComputedStyle(el)[property as any]
        case 'attribute':
          return el.getAttribute(property!)
        case 'textContent':
          return el.textContent
        default:
          return null
      }
    },
    { selector, evaluationType, property },
  )
}

/**
 * Create a test evaluator instance
 * @param e2eTestCtx - E2E test context
 * @returns Evaluator instance
 */
export function createTestEvaluator(
  e2eTestCtx: E2EPlaywrightContext,
): Evaluator {
  return {
    /**
     * Get element's text content
     */
    async getTextContent(selector: string, page?: Page): Promise<EvaluateResult> {
      const pageCtx = page ?? e2eTestCtx.page
      return await evaluateElement(pageCtx, selector, 'textContent')
    },

    /**
     * Get element's color style
     */
    async getColor(selector: string, page?: Page): Promise<EvaluateResult> {
      const pageCtx = page ?? e2eTestCtx.page
      return await evaluateElement(pageCtx, selector, 'style', 'color')
    },

    /**
     * Get element's display style
     */
    async getDisplayStyle(selector: string, page?: Page): Promise<EvaluateResult> {
      const pageCtx = page ?? e2eTestCtx.page
      return await evaluateElement(pageCtx, selector, 'style', 'display')
    },

    /**
     * Get element's src attribute (usually for images, videos and other assets)
     */
    async getAssetUrl(selector: string, page?: Page): Promise<EvaluateResult> {
      const pageCtx = page ?? e2eTestCtx.page
      return await evaluateElement(pageCtx, selector, 'attribute', 'src')
    },

    /**
     * Get element's justify-content style
     */
    async getJustifyContent(selector: string, page?: Page): Promise<EvaluateResult> {
      const pageCtx = page ?? e2eTestCtx.page
      return await evaluateElement(pageCtx, selector, 'style', 'justifyContent')
    },

    /**
     * Clear localStorage
     */
    async clearLocalStorage(page?: Page): Promise<void> {
      const pageCtx = page ?? e2eTestCtx.page
      await pageCtx?.evaluate(() => {
        localStorage.clear()
      })
    },

    /**
     * Get element count
     */
    async getElementCount(selector: string, page?: Page): Promise<number> {
      const pageCtx = page ?? e2eTestCtx.page
      return await pageCtx?.evaluate(selector => document.querySelectorAll(selector).length, selector) ?? 0
    },

    /**
     * Input text
     */
    async inputText(selector: string, text: string, page?: Page): Promise<void> {
      const pageCtx = page ?? e2eTestCtx.page
      await pageCtx?.fill(selector, text)
    },

    /**
     * Click element
     */
    async click(selector: string, page?: Page): Promise<void> {
      const pageCtx = page ?? e2eTestCtx.page
      await pageCtx?.click(selector)
    },

    /**
     * Check if image is successfully loaded
     */
    async isImageLoaded(selector: string, page?: Page): Promise<EvaluateResult> {
      const pageCtx = page ?? e2eTestCtx.page
      if (!pageCtx) {
        return null
      }
      try {
        await pageCtx.waitForFunction((selector) => {
          const img = document.querySelector(selector) as HTMLImageElement
          // An image is considered loaded if it's "complete" and has a natural width > 0.
          return img && img.complete && img.naturalWidth > 0
        }, selector)
        return true
      }
      catch {
        return false
      }
    },
  }
}
