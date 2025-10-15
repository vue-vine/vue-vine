export default function Welcome() {
  const content = vineProp<string>()
  const counter = ref(0)
  const contentColor = ref('red')
  const increment = () => { counter.value += 1 }
  const decrement = () => { counter.value -= 1 }

  vineStyle.scoped(`
    .content-view {
      margin: 1rem 0;
      color: v-bind(contentColor);
    }
  `)

  vineExpose({
    contentColor,
  })

  return vine`
    <div>
      <div>Vue Vine!</div>
      <div class="content-view">{{ content }}</div>
      <div>
        <button @click="increment">+</button>
        {{ counter }}
        <button @click="decrement">-</button>
      </div>
    </div>
  `
}
