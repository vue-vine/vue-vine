import { useTemplateRef } from 'vue'

export function TestUseTemplateRefVirtualCode() {
  const container1Ref = useTemplateRef('container1Ref')
  const container2Ref = useTemplateRef<HTMLDivElement>('container2Ref')

  return vine`
    <div ref="container1Ref">Hello</div>
    <div ref="container2Ref">Hello</div>
  `
}
