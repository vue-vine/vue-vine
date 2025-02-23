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
  const text = vineModel<string>({ default: '' })

  watch(() => bar, (newVal) => {
    console.log('bar changed', newVal)
  })

  return vine`
    <div
      class="test-slot-container mt-6 cursor-pointer select-none"
      @click="num++"
    >
      <input
        class="h-10 w-60 border-none bg-zinc-100 rounded-md p-2 outline-none mb-4"
        type="text"
        v-model="text"
      />
      <p>fizz: "{{ fizz }}", bar: "{{ bar }}"</p>
      <slot name="slotCamel" :foo="num"></slot>
    </div>
  `
}

declare const useRequest: <T = any>(url: string) => { data: Ref<T> }

export function AboutPage() {
  const handleEmitCamel = (bar: string) => {
    console.log(bar)
  }
  const testSlotContainerText = ref('')
  const { data: testDataRef } = useRequest('...')

  const slotContainerRef = ref()

  return vine`
    <PageHeader />
    <div>
      <h2>About page</h2>
    </div>
    <p class="my-4">
      TestSlotContainer text: {{ testSlotContainerText ?? "__Empty__" }}
    </p>
    {{ testDataRef }}
    <TestSlotContainer
      ref="slotContainerRef"
      fizz="bass"
      :bar="10"
      @emit-camel="handleEmitCamel"
      v-model="testSlotContainerText"
    >
      <template #slotCamel="{ foo }">
        <p>in slot: {{ foo }}</p>
      </template>
    </TestSlotContainer>
  `
}
