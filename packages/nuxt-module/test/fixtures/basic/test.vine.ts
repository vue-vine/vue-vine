/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// @ts-nocheck

import { ref } from "vue"

export function VineTest() {
  const count = ref(0)
  const color = ref('red')
  const increment = () => { count.value += 1 }
  const decrement = () => { count.value -= 1 }

  vineStyle.scoped(`
    .vine-nuxt-module-test .count {
      color: v-bind(color);
    }
  `)

  return vine`
    <div class="vine-nuxt-module-test">
      <p class="count">Count: {{ count }}</p>
      <button class="test-inc-btn" @click="increment()">+</button>
      <button class="test-dec-btn" @click="decrement()">-</button>
    </div>
  `
}
