function ChildCompOne(props: {
  foo: string
  bar: number
}) {
  vineValidators({
    foo: val => val.startsWith('foo'),
    bar: val => val > 10,
  })

  return vine`
    <div>
      <h3>Child Comp 1</h3>
      <p>foo: {{ foo }}</p>
      <p>bar: {{ bar }}</p>
    </div>
  `
}

function ChildCompTwo() {
  const zig = vineProp<string>(val => val.startsWith('zig'))
  const zag = vineProp<number>(val => val > 10)

  return vine`
    <div>
      <h3>Child Comp 2</h3>
      <p>zig: {{ zig }}</p>
      <p>zag: {{ zag }}</p>
    </div>
  `
}

export function TestVineValidatorsPage() {
  return vine`
    <div>
      <ChildCompOne foo="hello" :bar="5" />
      <ChildCompTwo zig="world" :zag="6" />
    </div>
  `
}
