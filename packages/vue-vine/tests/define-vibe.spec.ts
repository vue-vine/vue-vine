import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import { defineVibe } from '../src/defineVibe'

async function mockDataFetch() {
  return new Promise<{ data: string }>((resolve) => {
    setTimeout(() => {
      resolve({ data: 'mock data' })
    }, 500)
  })
}

describe('defineVibe', () => {
  it('should work as a data store', async () => {
    const [useCounter, initCounter] = defineVibe('counter', () => {
      const count = ref(0)
      const increment = () => {
        count.value++
      }
      return { count, increment }
    })

    const Counter = defineComponent({
      setup() {
        const { count, increment } = useCounter()
        return { count, increment }
      },
      template: `
        <div>
          <button class="test-btn" @click="increment">Increment</button>
          <p>Count: {{ count }}</p>
        </div>
      `,
    })
    const App = defineComponent({
      components: { Counter },
      setup() {
        initCounter()
      },
      template: `
        <Counter />
      `,
    })

    const mounted = mount(App)
    expect(mounted.find('p').text()).toBe('Count: 0')
    await mounted.find('button.test-btn').trigger('click')
    expect(mounted.find('p').text()).toBe('Count: 1')
  })

  it('should work with async factory', async () => {
    const [useAsyncData, initAsyncData] = defineVibe('async-data', () => {
      const data = ref('')
      return { data }
    })

    const Counter = defineComponent({
      setup() {
        const { data } = useAsyncData()
        return { data }
      },
      template: `
        <div>
          <p v-if="!data">Loading...</p>
          <p v-else>Data: {{ data }}</p>
        </div>
      `,
    })

    const App = defineComponent({
      components: { Counter },
      setup() {
        initAsyncData(async ({ data }) => {
          const resp = await mockDataFetch()
          data.value = resp.data
        })
      },
      template: `
        <Counter />
      `,
    })

    const mounted = mount(App)
    expect(mounted.find('p').text()).toBe('Loading...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    expect(mounted.find('p').text()).toBe('Data: mock data')
  })
})
