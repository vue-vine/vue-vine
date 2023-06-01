import { ref } from 'vue'

export function App() {
  const count = ref(1)
  const add = () => {
    count.value = count.value++
  }
  const name = ref('vine')
  vineStyle(`
    .btn {
      margin-bottom: 1rem;
      font-size: 1rem;
      background: #334155;
      border-radius: 0.25rem;
      color: #fff;
      padding: 0.5rem 1rem;
      border: none;
      outline: none;
      cursor: pointer;
    }
  `)

  return vine`
    <button class="btn" @click="add">
      Random pick a post
    </button>
    <p class="pid">
      {{id}}
    </p>
    <p class="name">
      {{name}}
    </p>
  `
}
