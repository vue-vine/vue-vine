import type { TestProps } from '../types';

interface T1 {
  step?: number
}
function TestTsMorphAnother({ step = 3 }: T1) {
  return vine`
    <div class="text-zinc-500">Step: {{ step }}</div>
  `
}

export function TestTsMorphChild(props: TestProps) {
  return vine`
    <div class="p-2 bg-black text-white rounded-lg my-2">
      <h3>Title: {{ title }}</h3>
      <h4>Variant: {{ variant }}</h4>
      <p v-if="message">message: {{ message }}</p>
      <p v-if="errorCode">err code: {{ errorCode }}</p>
    </div>
  `
}

export function TestTsMorph() {
  return vine`
    <div>
      <h3>Test Ts Morph</h3>
      <div class="flex-row">
        <TestTsMorphChild
          variant="success"
          title="hello"
          message="Hello, world!"
        />
        <TestTsMorphChild variant="error" title="error" errorCode="404" />
      </div>
      <h3 class="mt-6">Another:</h3>
      <TestTsMorphAnother />
    </div>
  `
}
