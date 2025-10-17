import type { TestProps } from './types'

interface T1 {
  step?: number
}
function TestPropsDestruct({ step = 3 }: T1) {
  return vine`
    <div class="test-props-destruct flex flex-col">
      <h4>Test props destruct</h4>
      <div class="step text-zinc-500">Step: {{ step }}</div>
    </div>
  `
}

export function TestTsMorphChild(props: TestProps) {
  return vine`
    <div class="test-ts-morph-child p-2 bg-black text-white rounded-lg my-2">
      <h3 class="title">Title: {{ title }}</h3>
      <h4>Variant: {{ variant }}</h4>
      <p class="message" v-if="message">message: {{ message }}</p>
      <p class="error-code" v-if="errorCode">err code: {{ errorCode }}</p>
    </div>
  `
}

export function TestTsMorphComplexExternal() {
  return vine`
    <div class="test-ts-morph-complex-external">
      <h3>Test Ts Morph</h3>
      <div class="flex-row">
        <TestTsMorphChild variant="success" title="hello" message="Hello, world!" />
        <TestTsMorphChild variant="error" title="error" errorCode="404" />
      </div>
      <h3 class="mt-6">Another:</h3>
      <TestPropsDestruct />
    </div>
  `
}
