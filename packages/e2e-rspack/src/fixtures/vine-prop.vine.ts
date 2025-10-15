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
  const prop1 = vineProp<string>()
  const prop2 = vineProp.withDefault('bar')
  const prop3 = vineProp<boolean>()
  const prop4 = vineProp.withDefault(false)
  const prop5 = vineProp<PropTypeMapper<'t2'>>()
  const prop6 = vineProp.withDefault(mayGetBoolean())

  vineStyle.scoped(`
    .child-comp {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      border: 2px solid #3498db;
      border-radius: 8px;
      background-color: #ecf0f1;
    }

    .child-comp p {
      margin: 0;
      padding: 0.25rem 0;
    }
  `)

  return vine`
    <div class="child-comp">
      <p>prop1: {{ prop1 }}</p>
      <p>prop2: {{ prop2 }}</p>
      <p>prop3: {{ prop3 }}</p>
      <p>prop4: {{ prop4 }}</p>
      <p>prop5: {{ prop5 }}</p>
      <p>typeof prop6: {{ typeof prop6 }}</p>
    </div>
  `
}

export function TestVinePropPage() {
  vineStyle(`
    .test-vine-prop-page {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }
  `)

  return vine`
    <div class="test-vine-prop-page">
      <h2>Vine Prop Test</h2>
      <ChildComp prop1="hello" prop2="world" :prop3="false" :prop4="true" prop5 />
    </div>
  `
}
