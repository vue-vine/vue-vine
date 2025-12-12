// Test case for props formal parameter with type annotation and emits
export function TestPropsWithEmits(props: {
  name: string
  age?: number
}) {
  const emits = vineEmits(['submit', 'cancel'])

  return vine`
    <div>
      <p>Name: {{ name }}</p>
      <p v-if="age">Age: {{ age }}</p>
      <button @click="emits('submit', name)">Submit</button>
      <button @click="emits('cancel')">Cancel</button>
    </div>
  `
}

export function TestParent() {
  const handleSubmit = (evt: SubmitEvent) => {
    console.log('Submitted:', evt)
  }

  const handleCancel = () => {
    console.log('Cancelled')
  }

  return vine`
    <TestPropsWithEmits name="John" :age="30" @submit="handleSubmit" @cancel="handleCancel" />
  `
}
