interface TestDestructureProps {
  foo: string
  bar?: number
  other: boolean
}

function MyComponent({
  foo,
  bar = 1,
  other
}: TestDestructureProps) {
  return vine`
    <ul class="test-props-destructure">
      <li id="item-1">foo: {{ foo }}</li>
      <li id="item-2">bar: {{ bar }}</li>
      <li id="item-3">other: {{ other }}</li>
    </ul>
  `
}

export function TestDestructurePropsPage() {
  vineStyle.scoped(`
    .container {
      background-color: #eeeeee;
      padding: 0.25rem;
    }
  `)

  return vine`
    <div class="container">
      <MyComponent foo="hello" other />
    </div>
  `
}
