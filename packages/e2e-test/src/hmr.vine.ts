
import { computed, ref } from 'vue'
import type { TestProps, WatermarkProps } from './types';

export function TestTsMorph(props: TestProps) {
  return vine`
    <div class="test-ts-morph">
      <span>foo: {{ foo }}</span>
    </div>
  `
}

export function TestComplexTsMorph(props: WatermarkProps) {
  const isShow = computed(() => props.zIndex > 10)

  return vine`
    <div v-show="isShow" class="test-complex-ts-morph">
      <h4>This is a complex ts-morph example</h4>
      <span>{{ content }}</span>
    </div>
  `
}

export function HmrApp() {
  const count = ref(0)
  const name = ref('vine')
  const content = ref('lorem ipsum')
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
    <TestComplexTsMorph
      :z-index="12"
      :content
      :rotate="0"
      :gap="[10, 10]"
    />
  `
}
