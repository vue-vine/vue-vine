import { ref } from 'vue'

function VirtualDOMComp() {
  const msg = ref('')

  return vine`
    <div class="test-vdom-comp col-flex gap-2 p-2 border-1 border-solid border-blue-400 rounded-md">
      <h3 class="text-zinc-500">Virtual DOM Component in Vapor slot</h3>
      <input v-model="msg" />
      <p>{{ msg }}</p>
    </div>
  `
}

function TestVaporComp() {
  const count = ref(0)
  const add = () => count.value++
  const sub = () => count.value--

  return vine.vapor`
    <div
      class="test-vapor-comp col-flex gap-2 p-2 border-1 border-solid border-orange-400 rounded-md"
    >
      <h3 class="text-zinc-500">Vapor Component in Virtual DOM component</h3>
      <div class="row-flex gap-2">
        <button @click="add">+</button>
        <button @click="sub">-</button>
      </div>
      <p>Count: {{ count }}</p>

      <img class="w-60" src="@/assets/sample.jpg" alt="sample-img-in-vapor-comp" />

      <slot />
    </div>
`
}

function TestAnotherVaporComp() {
  'use vapor'

  return vine`
    <div
      class="test-another-vapor-comp col-flex gap-2 p-2 border-1 border-solid border-green-400 rounded-md"
    >
      <span class="text-zinc-500">Another Vapor Component</span>
      <img class="w-60" src="https://placehold.co/200x100" alt="remote-img-as-placeholder" />
    </div>
`
}

export function VaporTestContainer() {
  return vine`
    <div class="vapor-test-container col-flex">
      <TestVaporComp>
        <VirtualDOMComp />
      </TestVaporComp>
      <TestAnotherVaporComp />
    </div>
  `
}
