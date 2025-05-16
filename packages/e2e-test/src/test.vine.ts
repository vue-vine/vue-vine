import type { TestProps } from './types';
import { ref } from 'vue'

function TestTsMorph(props: TestProps) {
  return vine`
    <div class="test-ts-morph">
      <span>foo: {{ foo }}</span>
    </div>
  `
}

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
    <div class="name">{{name}}</div>
    <button class="test-btn" @click="inc">Increase count</button>
    <p class="text-for-replace">text111</p>
    <div class="counter">Count: {{count}}</div>

    <TestTsMorph :foo="123" />
  `
}
