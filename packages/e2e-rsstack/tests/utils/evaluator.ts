import type { Page } from 'playwright-chromium'
import type { E2EPlaywrightContext, EvaluateType, Evaluator, Nil } from './types'

/**
 * Generic element property/style/content evaluation function
 */
async function evaluateElement(
  page: Page | undefined,
  selector: string,
  evaluationType: EvaluateType,
  property?: string,
): Promise<string | Nil> {
  if (!page) {
    return null
  }

  return await page.evaluate(
    ({ selector, evaluationType, property }) => {
      const el = document.querySelector(selector)
      if (!el) {
        return null
      }

      if (evaluationType === 'style') {
        return getComputedStyle(el)[property as any]
      }
      else if (evaluationType === 'textContent') {
        return el.textContent
      }
      else if (evaluationType === 'attribute') {
        return el.getAttribute(property as string)
      }

      return null
    },
    { selector, evaluationType, property },
  )
}

/**
 * Create a test evaluator instance
 */
export function createEvaluator(
  e2eTestCtx: E2EPlaywrightContext,
): Evaluator {
  return {
    /**
     * Get element's text content
     */
    async getTextContent(selector: string, page?: Page): Promise<string | Nil> {
      const pageCtx = page ?? e2eTestCtx.page
      return await evaluateElement(pageCtx, selector, 'textContent')
    },

    /**
     * Get element's color style
     */
    async getColor(selector: string, page?: Page): Promise<string | Nil> {
      const pageCtx = page ?? e2eTestCtx.page
      return await evaluateElement(pageCtx, selector, 'style', 'color')
    },

    /**
     * Get element's attribute value
     */
    async getAttribute(selector: string, attribute: string, page?: Page): Promise<string | Nil> {
      const pageCtx = page ?? e2eTestCtx.page
      return await evaluateElement(pageCtx, selector, 'attribute', attribute)
    },
  }
}
