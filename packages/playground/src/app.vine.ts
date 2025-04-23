function VaporExample() {
  'use vapor'
  const count = ref(0)

  return vine`
    <div class="mb-8">
      <h2>Vapor Example</h2>
      <p>Count: {{ count }}</p>
      <button @click="count++">+1</button>
    </div>
  `
}

export function VaporPage() {
  return vine`
    <h2 class="mb-4">This is Vapor mode in Vue Vine!</h2>
    <VaporExample />
  `
}


export function App() {
  return vine`
    <router-view />
  `
}
