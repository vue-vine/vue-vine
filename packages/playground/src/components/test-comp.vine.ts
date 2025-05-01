export function TestComp(props: {
  foo: string
}) {
  const msg = ref('Hello, world!')

  return vine`
    <div>
      <input type="text" v-model="msg" />
      <p>props.foo: {{ foo }}</p>
      <p>{{ msg }}</p>
    </div>
  `
}