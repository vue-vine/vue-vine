function Welcome() {

  const content = vineProp<string>()
  const counter = ref(0)

  return vine`
    <div>
      <div>Vue Vine!</div>
      <div>{{ content }}</div>
      <div>
        <button @click="() => counter++">+</button>
        {{ counter }}
        <button @click="() => counter--">-</button>
      </div>
    </div>
  `
}

export default Welcome
