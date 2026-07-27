import type { Directive } from 'vue'

/**
 This needs to be configured in shims.d.ts with:
  declare module 'vue' {
    interface HTMLAttributes {
      border?: string
    }
  }
 */
export function TestUnoCssAttributeMode() {
  const vBounce: Directive<HTMLElement> = {
    mounted(el) {
      el.classList.add('bounce')
    },
  }

  return vine`
    <div v-bounce border="1px solid red">
      <span>foo</span>
    </div>
  `
}
