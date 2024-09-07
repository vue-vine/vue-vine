/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// @ts-nocheck

import { ref } from "vue"

export function VineTest() {
  const count = ref(0)
  const increment = () => { count.value += 1 }
  const decrement = () => { count.value -= 1 }

  return vine`
    <div class="vine-nuxt-module-test">
      <p>Count: {{ count }}</p>
      <button class="test-inc-btn" @click="increment()">+</button>
      <button class="test-dec-btn" @click="decrement()">-</button>
    </div>
  `
}
