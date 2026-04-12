import { onMounted } from 'vue'

export function SampleOne() {
  const count = ref(0)
  const msg = ref('hello world')

  const p1 = vineProp<string>()
  vineOptions({
    name: 'ESLintErrsSample',
  })

  onMounted(() => {
    console.log('count: ', count.value)
    console.log('msg: ', msg.value)
    console.log('p1: ', p1.value)
  })

  return vine`
    <div>Test case for 'vue-vine/format-vine-macros-leading'</div>
  `
}
