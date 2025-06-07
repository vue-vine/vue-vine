type PropTypeMapper<T extends 't1' | 't2'> = T extends 't1' ? string : boolean

function mayGetBoolean() {
  const randomNumber = Math.random()
  // Actually it always returns true,
  // we just build a function may returns boolean or string
  if (randomNumber > 0) {
    return true
  }
  return 'false'
}

function ChildComp() {
  const p1 = vineProp<string>()
  const p2 = vineProp.withDefault('bar')
  const p3 = vineProp<boolean>()
  const p4 = vineProp.withDefault(false)
  const p5 = vineProp<PropTypeMapper<'t2'>>()
  const p6 = vineProp.withDefault(mayGetBoolean())

  return vine`
    <div class="child-comp col-flex gap-2">
      <p>p1: {{ p1 }}</p>
      <p>p2: {{ p2 }}</p>
      <p>p3: {{ p3 }}</p>
      <p>p4: {{ p4 }}</p>
      <p>p5: {{ p5 }}</p>
      <p>typeof p6: {{ typeof p6 }}</p>
    </div>
  `
}

export function TestVinePropPage() {

  return vine`
    <div class="test-vine-prop-page col-flex">
      <ChildComp p1="hello" p2="world" :p3="false" :p4="true" p5 />
    </div>
  `
}