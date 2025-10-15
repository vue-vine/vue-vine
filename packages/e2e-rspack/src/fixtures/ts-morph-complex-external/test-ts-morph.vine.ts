import type { TestProps } from './types'

interface T1 {
  step?: number
}

function TestPropsDestruct({ step = 3 }: T1) {
  vineStyle.scoped(`
    .test-props-destruct {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      border: 2px solid #95a5a6;
      border-radius: 8px;
      margin-top: 1rem;
    }

    .step {
      color: #7f8c8d;
      margin-top: 0.5rem;
    }
  `)

  return vine`
    <div class="test-props-destruct">
      <h4>Test props destruct</h4>
      <div class="step">Step: {{ step }}</div>
    </div>
  `
}

export function TestTsMorphChild(props: TestProps) {
  vineStyle.scoped(`
    .test-ts-morph-child {
      padding: 1rem;
      background-color: #dfefff;
      border-radius: 8px;
      margin: 0.5rem 0;
    }

    .title {
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
    }

    .message,
    .error-code {
      margin: 0.25rem 0;
    }
  `)

  return vine`
    <div class="test-ts-morph-child">
      <h3 class="title">Title: {{ title }}</h3>
      <h4>Variant: {{ variant }}</h4>
      <p class="message" v-if="message">message: {{ message }}</p>
      <p class="error-code" v-if="errorCode">err code: {{ errorCode }}</p>
    </div>
  `
}

export function TestTsMorphComplexExternal() {
  vineStyle(`
    .test-ts-morph-complex-external {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .flex-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .mt-6 {
      margin-top: 1.5rem;
    }
  `)

  return vine`
    <div class="test-ts-morph-complex-external">
      <h2>Test Ts Morph Complex External</h2>
      <div class="flex-row">
        <TestTsMorphChild variant="success" title="hello" message="Hello, world!" />
        <TestTsMorphChild variant="error" title="error" errorCode="404" />
      </div>
      <h3 class="mt-6">Another:</h3>
      <TestPropsDestruct />
    </div>
  `
}

