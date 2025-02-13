function VaporExample() {
  'use vapor'
  const count = ref(0)

  return vine`
    <div class="mb-8">
      <h2>Vapor Example</h2>
      <p class="my-2">Count: {{ count }}</p>
      <button class="px-4 py-2 rounded cursor-pointer" @click="count++">
        +1
      </button>
    </div>
  `
}

export function VaporPage() {
  return vine`
    <PageHeader />
    <h2 class="mb-4">This is Vapor mode in Vue Vine!</h2>
    <VaporExample />
  `
}
