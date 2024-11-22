// #region Fixures for ESLint show warns and errors in VSCode

function Comp() {
  const foo = vineProp<string>()

  return vine`
    <div>child comp - {{ foo }}</div>
  `
}

export function Sample() {
  const count = ref(0)
  const msg = ref('hello world')

  const p1 = vineProp<string>()
  vineOptions({
    name: 'ESLintErrsSample'
  })

  return vine`
    <div
      style="font-size: 15px"
      :style="{
        color: count > 5 ? 'red' : 'blue',
      }"
    >
      <p v-text="msg">Dida dida</p>
      <comp foo="111" :foo="'222'" />
    </div>
  `
}

// #endregion

// #region Fixtures for testing props check in VSCode
function Comp1() {
  const zee = vineProp<string>()
  const foo = vineProp.withDefault(0)

  return vine`
    <div>This is Comp1 - foo {{ foo }}</div>
  `
}

function Comp2() {
  const bar = ref('123')

  return vine`
    <div>This is Comp2 - bar {{ bar }}</div>
    <Comp1 />
    <!-- ^^^ It should reports error here -->
    <!-- due to missing required prop 'zee' but not for 'foo' -->
  `
}
// #endregion
