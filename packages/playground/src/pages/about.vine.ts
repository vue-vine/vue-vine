import { PageHeader } from '../components/page-header.vine'

function TestSlotContainer(props: {
  fizz: string
}) {
  // const fizz = vineProp<string>()
  vineEmits<{ emitCamel: [bar: string] }>()
  vineSlots<{ slotCamel(props: { foo: number }): any }>()

  const num = ref(1)

  return vine`
    <div class="test-slot-container">
      <p>{{ fizz }}</p>
      <slot name="slotCamel" :foo="num"></slot>
    </div>
  `
}

export function About() {
  const handleEmitCamel = (bar: string) => {
    console.log(bar)
  }

  return vine`
    <PageHeader />
    <div>
      <h2>About page</h2>
    </div>
    <TestSlotContainer fizz="bass" @emit-camel="handleEmitCamel">
      <template #slotCamel="{ foo }">
        <p>in slot: {{ foo }}</p>
      </template>
    </TestSlotContainer>
  `
}
