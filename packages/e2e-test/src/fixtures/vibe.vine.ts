import { ref } from 'vue'
import { defineVibe } from 'vue-vine'

async function mockDataFetch() {
  return new Promise<{ result: string }>((resolve) => {
    setTimeout(() => {
      resolve({ result: 'mock data' })
    }, 1000)
  })
}

const [useCounter, initCounter] = defineVibe('counter', () => {
  const count = ref(0)
  const increment = () => {
    count.value++
  }
  return { count, increment }
})
const [useAsyncData, initAsyncData] = defineVibe('async-data', () => {
  const data = ref('')
  return { data }
})

function ChildComp1() {
  const { count, increment } = useCounter()

  return vine`
    <div class="child-comp-1">
      <p>Count: {{ count }}</p>
      <button @click="increment">Increment</button>
    </div>
  `
}

function ChildComp2() {
  const { data } = useAsyncData()

  return vine`
    <div class="child-comp-2">
      <p>Data: {{ data }}</p>
    </div>
  `
}

export function TestVibe() {
  initCounter()
  initAsyncData(async ({ data }) => {
    const { result } = await mockDataFetch()
    data.value = result
  })

  return vine`
    <div>
      <ChildComp1 />
      <ChildComp2 />
    </div>
  `
}
