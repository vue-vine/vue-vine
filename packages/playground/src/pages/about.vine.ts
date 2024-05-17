import { PageHeader } from '../components/page-header.vine'

function Button() {
  const emit = vineEmits<{
    click: [e: MouseEvent]
  }>()

  return vine`
    <button @click="(e) => emit('click',e)">Click me</button>
  `
}

export function About() {
  function print(e) {
    console.log(`Clicked, (${e.x}, ${e.y})`)
  }

  return vine`
    <PageHeader />
    <div>
      <h2>About page</h2>
      <Button @click="(e) => print(e)" style="margin-top: 5px; cursor: pointer" />
    </div>
  `
}
