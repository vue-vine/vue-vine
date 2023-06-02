import { ref } from 'vue'

export function App() {
  const count = ref(0)
  const name = ref('vine')
  const inc = () => {
    count.value += 2
  }
  vineStyle(`
    .test-btn {
      color: black;
    }
  `)

  return vine`
    <span class="name">{{name}}</span>
    <button class="test-btn" @click="inc">Increase count</button>
    <p class="text-for-replace">text111</p>
    <div class="counter">Count: {{count}}</div>
  `
}
