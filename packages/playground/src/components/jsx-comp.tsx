import { VineComp } from './test-comps.vine'

interface JsxCompProps {
  name: string
  age: number
}

export const JsxComp = defineComponent<JsxCompProps>({
  setup(props) {
    const count = ref(0)

    return () => (
      <div>
        <p>Name: {props.name}</p>
        <p>Age: {props.age}</p>
        <button onClick={() => count.value++}>Click me</button>
        <p>
          Count:
          {count.value}
        </p>
        <VineComp foo="111" />
      </div>
    )
  },
})
