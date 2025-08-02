import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const counter = ref(0)

  function increment(step = 1) {
    counter.value += step
  }

  return {
    counter,
    increment,
  }
})
