function Counter(props: {
  step: number;
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
      <p>Count: {{ count }}</p>
      <button @click="count += step">+</button>
      <button @click="count -= step">-</button>
    </div>
  `
}

export function App() {
  return vine`
    <div>
      <Counter step="1" />
      <Counter step="2" />
    </div>
  `
}
