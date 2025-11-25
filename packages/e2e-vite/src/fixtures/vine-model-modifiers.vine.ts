import { ref } from 'vue'
import '../styles/atom.css'

/**
 * Child component that uses vineModel with array destructuring
 * to access both model ref and modifiers
 */
export function ModifierInput() {
  const [value, modifiers] = vineModel<string, 'trim' | 'uppercase'>()

  vineStyle.scoped(`
    .modifier-input {
      width: 200px;
      background-color: #f0f0f0;
      border: none;
      outline: none;
      padding: 0.5rem;
      box-shadow: 0 0 0 1px #00000011;
    }
    .modifier-status {
      font-size: 0.75rem;
      color: #666;
      margin-top: 0.25rem;
    }
  `)

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement
    let newValue = target.value

    // Apply modifiers
    if (modifiers.trim) {
      newValue = newValue.trim()
    }
    if (modifiers.uppercase) {
      newValue = newValue.toUpperCase()
    }

    value.value = newValue
  }

  return vine`
    <div>
      <input class="modifier-input" type="text" :value="value" @input="handleInput" />
      <div class="modifier-status flex flex-col">
        <span v-if="modifiers.trim" class="has-trim">.trim</span>
        <span v-if="modifiers.uppercase" class="has-uppercase">.uppercase</span>
      </div>
    </div>
  `
}

/**
 * Child component with named model and modifiers
 */
export function NamedModifierInput() {
  const [value, modifiers] = vineModel<string, 'capitalize'>('content')

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement
    let newValue = target.value

    // Apply capitalize modifier
    if (modifiers.capitalize && newValue.length > 0) {
      newValue = newValue.charAt(0).toUpperCase() + newValue.slice(1)
    }

    value.value = newValue
  }

  return vine`
    <div>
      <input class="named-modifier-input" type="text" :value="value" @input="handleInput" />
      <div class="modifier-status">
        <span v-if="modifiers.capitalize" class="has-capitalize">.capitalize</span>
      </div>
    </div>
  `
}

/**
 * Test page for vineModel modifiers
 */
export function TestVineModelModifiers() {
  const trimValue = ref('')
  const uppercaseValue = ref('')
  const trimUppercaseValue = ref('')
  const capitalizeValue = ref('')

  vineStyle.scoped(`
    .container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }
    .test-case {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .label {
      font-weight: 500;
    }
    .show-msg {
      border-bottom: 1px solid #00000011;
      min-width: 200px;
      padding: 0.25rem 0;
      color: #333;
    }
  `)

  return vine`
    <div class="container">
      <h2>Test Vine Model Modifiers</h2>

      <div class="test-case">
        <div class="label">With .trim modifier:</div>
        <ModifierInput v-model.trim="trimValue" />
        <div class="show-msg trim-result">Value: "{{ trimValue }}"</div>
      </div>

      <div class="test-case">
        <div class="label">With .uppercase modifier:</div>
        <ModifierInput v-model.uppercase="uppercaseValue" />
        <div class="show-msg uppercase-result">Value: "{{ uppercaseValue }}"</div>
      </div>

      <div class="test-case">
        <div class="label">With .trim.uppercase modifiers:</div>
        <ModifierInput v-model.trim.uppercase="trimUppercaseValue" />
        <div class="show-msg trim-uppercase-result">Value: "{{ trimUppercaseValue }}"</div>
      </div>

      <div class="test-case">
        <div class="label">Named model with .capitalize:</div>
        <NamedModifierInput v-model:content.capitalize="capitalizeValue" />
        <div class="show-msg capitalize-result">Value: "{{ capitalizeValue }}"</div>
      </div>
    </div>
  `
}
