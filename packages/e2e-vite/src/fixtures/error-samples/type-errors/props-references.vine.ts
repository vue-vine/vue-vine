import { ref } from 'vue'

// Fixtures for testing component reference & props check in VSCode
function TestCompOne() {
  /** @description zee is a string! */
  const zee = vineProp<string>()
  const foo = vineProp.withDefault(0)

  const emits = vineEmits<{
    clickTest: [boolean]
  }>()

  return vine`
    <div @click="emits('clickTest', true)">This is Comp1</div>
    <p>zee: {{ zee }}</p>
    <p>foo: {{ foo }}</p>
  `
}

function TestCompTwo() {
  const bar = ref('123')

  return vine`
    <div>This is Comp2 - bar {{ bar }}</div>
    <UnknownComp />
    <!-- ^^^ It should reports error here -->
    <!-- due to unknown component 'UnknownComp' -->
    <TestCompOne :zee="123" />

    <!-- due to missing required prop 'zee' but not for 'foo' -->
  `
}

export { TestCompOne, TestCompTwo }
