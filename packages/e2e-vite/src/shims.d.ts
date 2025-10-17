declare module 'vue' {
  interface GlobalComponents {
    'vi-sample-custom-element': typeof import('./fixtures/custom-elements.vine')['SampleCustomElement']
    'vi-another-custom-element': typeof import('./fixtures/custom-elements.vine')['AnotherCustomElement']
  }
}

export {}
