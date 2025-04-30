export function TestComp() {
  const msg = ref('Hello, world!')

  return vine`
    <div>
      <input type="text" v-model="msg" />
      <p>{{ msg }}</p>
    </div>
  `
}