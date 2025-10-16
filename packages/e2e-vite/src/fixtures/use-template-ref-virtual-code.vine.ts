import { useTemplateRef } from 'vue'

export function TestUseTemplateRefVirtualCode() {
  const container1Ref = useTemplateRef('container1Ref')
  const container2Ref = useTemplateRef<HTMLDivElement>('container2Ref')

  onMounted(() => {
    console.log('container1Ref', container1Ref.value)
    console.log('container2Ref', container2Ref.value)
  })

  return vine`
    <div ref="container1Ref">Hello</div>
    <div ref="container2Ref">Hello</div>
  `
}
