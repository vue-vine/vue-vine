import { ref, Ref } from 'vue'
//           ^^^^ Deliberately import an extra useless type item here
//                - For ESLint rules to catch it
//                - Test if it broke compilation in JS runtime
import { PageHeader } from '../components/page-header.vine'

function TestSlotContainer({ fizz, bar }: {
  fizz: string,
  bar: number
}) {
  // const fizz = vineProp<string>()
  vineEmits<{ emitCamel: [bar: string] }>()
  vineSlots<{ slotCamel(props: { foo: number }): any }>()

  const num = ref(1)

  return vine`
    <div class="test-slot-container">
      <p>{{ fizz }} {{ bar }}</p>
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
    <TestSlotContainer fizz="bass" :bar="1" @emit-camel="handleEmitCamel">
      <template #slotCamel="{ foo }">
        <p>in slot: {{ foo }}</p>
      </template>
    </TestSlotContainer>
  `
}
