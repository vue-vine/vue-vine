import { TestComp } from './test-comp.vine'

export const JsxComp = defineComponent({
  setup() {
    const count = ref(0)

    return () => (
      <div>
        <button onClick={() => count.value++}>Click me</button>
        <p>
          Count:
          {count.value}
        </p>
        <TestComp />
      </div>
    )
  },
})
