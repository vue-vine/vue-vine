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
      <blockquote
        class="text-xs text-#666 border-l-4 border-l-blueGray border-l-solid py-2 px-4 bg-#f0f0f0"
      >
        Click two emits buttons above, the count should be increased.
      </blockquote>
      <div class="result">count: {{ count }}</div>
    </div>
  `
}
