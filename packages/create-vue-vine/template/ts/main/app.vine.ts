import { ref } from 'vue'

function Counter(props: {
  step: number
}) {
  const count = ref(0)

  vineStyle(`
    .counter {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      margin: 0 0 1rem;
    }
  `)

  return vine`
    <div class="counter">
      <button @click="count += step"> +{{ step }} </button>
      <p>Count: {{ count }}</p>
      <button @click="count -= step"> -{{ step }} </button>
    </div>
  `
}

export function App() {
  return vine`
    <div class="container">
      <h1>Vue Vine</h1>
      <Counter step="2" />
    </div>
  `
}
