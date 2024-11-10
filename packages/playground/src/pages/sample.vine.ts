function comp() {
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






