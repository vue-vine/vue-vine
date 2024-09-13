function Welcome() {
  const content = vineProp<string>()
  const counter = ref(0)
  const contentColor = ref('red')

  vineStyle.scoped(scss`
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
        <button @click="() => counter++">+</button>
        {{ counter }}
        <button @click="() => counter--">-</button>
      </div>
    </div>
  `
}

export default Welcome
