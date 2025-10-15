import { ref } from 'vue'

// Child component with counter
export function Counter() {
  const count = ref(0)

  return vine`
    <div class="counter">
      <p>Count: {{ count }}</p>
      <button class="btn" @click="count++">Increment</button>
      <button class="btn" @click="count--">Decrement</button>
    </div>
  `
}

// Parent component with styles
export function TestRspackHmrPage() {
  vineStyle(`
    * {
      font-family: Menlo, monospace;
    }

    .app {
      max-width: 600px;
      margin: 0 auto;
    }

    .title {
      font-size: 2rem;
      margin-bottom: 1rem;
      color: brown;
    }

    .counter {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .btn {
      padding: 0.5rem 1rem;
      margin-right: 0.5rem;
      border: none;
      border-radius: 4px;
      background: orange;
      color: white;
      cursor: pointer;
    }

    .btn:hover {
      background: orangered;
    }
  `)

  return vine`
    <div class="hmr-test">
      <h1 class="title">Rspack HMR Test</h1>
      <Counter />
    </div>
  `
}

