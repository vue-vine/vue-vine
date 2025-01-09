import { ref } from 'vue'

interface CounterProps {
  step: number
}

function Counter(props: CounterProps) {
  const count = ref(0)

  vineStyle.scoped(`
    .counter {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      margin: 0 0 1rem;
    }

    button {
      padding: .413rem 1rem;
      border-radius: .25rem;
      border: 1px solid #88888850;
      background-color: transparent;
      transition: background-color .2s ease-in-out;
      user-select: none;
      cursor: pointer;
    }

    button:hover {
      background-color: #88888820;
    }

    button:active {
      background-color: #88888850;
    }

    .title {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }

    .actions {
      display: flex;
      gap: .5rem;
    }
  `)

  return vine`
    <div class="counter">
      <p class="title">Count: {{ count }}</p>

      <div class="actions">
        <button @click="count += step">Increment</button>
        <button @click="count -= step">Decrement</button>
      </div>
    </div>
  `
}

export function Home() {
  return vine`
    <Counter :step="2" />
  `
}
