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

function TargetComp(props: {
  foo: boolean
}) {
  const count = ref(0)

  const onClickCompOne = (foo: boolean) => {
    console.log('onClickCompOne: ', foo)
  }

  watchEffect(() => {
    console.log('count: ', count.value)
  })
  vineExpose({
    count,
  })

  return vine`
    <div @click="count++">Hello I'm target</div>
    <p>count: {{ count }}</p>
    <TestCompOne zee="123" :foo="456" @clickTest="onClickCompOne" />
  `
}

export function TestCompRef() {
  const target = useTemplateRef('target')

  console.log('target count: ', target.value?.count)

  return vine`
    <div>
      <TargetComp ref="target" !foo />
    </div>
  `
}
