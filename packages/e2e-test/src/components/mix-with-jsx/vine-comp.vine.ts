export function VineComp(props: {
  foo: string
}) {
  const msg = ref('Hello, world!')

  return vine`
    <div class="vine-comp">
      <input class="vine-comp-input" type="text" v-model="msg" />
      <p class="vine-comp-foo">props.foo: {{ foo }}</p>
      <p class="vine-comp-msg">{{ msg }}</p>
    </div>
  `
}