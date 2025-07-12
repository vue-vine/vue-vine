export function SampleCustomElement() {
  vineCustomElement()

  const count = ref(0)
  const addCount = () => count.value += 1

  return vine`
    <div class="border-1 border-amber-100 border-solid bg-amber-100/50 p-4">
      <p class="text-content mb-2">Count: {{ count }}</p>
      <button class="add-count-btn bg-amber-200" @click="addCount">+1</button>
    </div>
  `
}

// eslint-disable-next-line antfu/top-level-function
export const AnotherCustomElement = (
  props: { foo: string },
) => {
  vineCustomElement()

  return vine`
    <div>Another Custom Element</div>
  `
}

export function TestCustomElement() {
  customElements.define('vi-sample-custom-element', SampleCustomElement)
  customElements.define('vi-another-custom-element', AnotherCustomElement)

  return vine`
    <div class="flex flex-col gap-4">
      <h3>Custom Elements</h3>
      <vi-sample-custom-element />
      <vi-another-custom-element />
    </div>
  `
}
