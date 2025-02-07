import { ref, Ref } from 'vue'
//           ^^^^ Deliberately import an extra useless type item here
//                - For ESLint rules to catch it
//                - Test if it broke compilation in JS runtime
import { PageHeader } from '../components/page-header.vine'

function TestSlotContainer({ fizz, bar = 1 }: {
  fizz: string,
  bar?: number
}) {
  // const fizz = vineProp<string>()
  vineEmits<{ emitCamel: [bar: string] }>()
  vineSlots<{ slotCamel(props: { foo: number }): any }>()

  const num = ref(1)

  watch(() => bar, (newVal) => {
    console.log('bar changed', newVal)
  })

  return vine`
    <div class="test-slot-container mt-6">
      <p>fizz: "{{ fizz }}", bar: "{{ bar }}"</p>
      <slot name="slotCamel" :foo="num"></slot>
    </div>
  `
}

export function AboutPage() {
  const handleEmitCamel = (bar: string) => {
    console.log(bar)
  }
  return vine`
    <PageHeader />
    <div>
      <h2>About page</h2>
    </div>
    <TestSlotContainer fizz="bass" :bar="10" @emit-camel="handleEmitCamel">
      <template #slotCamel="{ foo }">
        <p>in slot: {{ foo }}</p>
      </template>
    </TestSlotContainer>
  `
}
