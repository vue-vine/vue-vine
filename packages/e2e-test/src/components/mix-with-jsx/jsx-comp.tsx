import { VineComp } from './vine-comp.vine'

export const JsxComp = defineComponent({
  props: {
    name: { type: String, required: true },
    age: { type: Number, required: true },
  },
  setup(props) {
    const count = ref(0)

    return () => (
      <div class="jsx-comp">
        <p class="jsx-comp-name">
          Name:
          {props.name}
        </p>
        <p class="jsx-comp-age">
          Age:
          {props.age}
        </p>
        <button class="jsx-comp-button" onClick={() => count.value++}>Click me</button>
        <p class="jsx-comp-count">
          Count:
          {count.value}
        </p>
        <VineComp foo="111" />
      </div>
    )
  },
})
