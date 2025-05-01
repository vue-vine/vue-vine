import { VineComp } from './test-comps.vine'

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
        <VineComp foo='111' />
      </div>
    )
  },
})
