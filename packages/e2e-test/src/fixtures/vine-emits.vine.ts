import { ref } from 'vue'

function TestDefineEmitsByTypes() {
  const emits = vineEmits<{
    foo: [string]
  }>()

  return vine`
    <button class="emits-defined-by-types" @click="emits('foo', '111')">
      emits defined by types
    </button>
  `
}

function TestDefineEmitsByNames() {
  const emits = vineEmits(['bar'])

  return vine`
    <button class="emits-defined-by-names" @click="emits('bar', '222')">
      emits defined by names
    </button>
  `
}

export function TestVineEmitsPage() {
  const count = ref(0)
  const onEvent = (event: any) => {
    console.log('accept event', event)
    count.value++
  }

  return vine`
    <div class="flex flex-col gap-4 p-4">
      <TestDefineEmitsByTypes @foo="onEvent" />
      <TestDefineEmitsByNames @bar="onEvent" />
      <div class="result">count: {{ count }}</div>
    </div>
  `
}
