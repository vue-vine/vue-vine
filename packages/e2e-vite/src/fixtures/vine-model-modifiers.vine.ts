import { ref } from 'vue'
import '../styles/atom.css'

/**
 * Child component that uses vineModel with array destructuring
 * to access both model ref and modifiers
 */
export function ModifierInput() {
  const [value, modifiers] = vineModel<string, 'trim' | 'uppercase'>()

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
      <input
        class="modifier-input w-200px bg-#f0f0f0 border-none outline-none p-2 shadow-[0_0_0_1px_#00000011]"
        type="text"
        :value="value"
        @input="handleInput"
      />
      <div class="text-xs text-#666 mt-1 flex flex-col">
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
      <input
        class="named-modifier-input w-200px bg-#f0f0f0 border-none outline-none p-2 shadow-[0_0_0_1px_#00000011]"
        type="text"
        :value="value"
        @input="handleInput"
      />
      <div class="text-xs text-#666 mt-1">
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

  return vine`
    <div class="flex flex-col gap-4 p-4">
      <h2 class="test-case">Test Vine Model Modifiers</h2>

      <div class="test-case flex flex-col gap-1">
        <div class="font-medium">With .trim modifier:</div>
        <ModifierInput v-model.trim="trimValue" />
        <div class="border-b border-[#00000011] min-w-200px py-1 text-#333 trim-result">
          Value: "{{ trimValue }}"
        </div>
      </div>

      <div class="test-case flex flex-col gap-1">
        <div class="font-medium">With .uppercase modifier:</div>
        <ModifierInput v-model.uppercase="uppercaseValue" />
        <div class="border-b border-[#00000011] min-w-200px py-1 text-#333 uppercase-result">
          Value: "{{ uppercaseValue }}"
        </div>
      </div>

      <div class="test-case flex flex-col gap-1">
        <div class="font-medium">With .trim.uppercase modifiers:</div>
        <ModifierInput v-model.trim.uppercase="trimUppercaseValue" />
        <div class="border-b border-[#00000011] min-w-200px py-1 text-#333 trim-uppercase-result">
          Value: "{{ trimUppercaseValue }}"
        </div>
      </div>

      <div class="test-case flex flex-col gap-1">
        <div class="font-medium">Named model with .capitalize:</div>
        <NamedModifierInput v-model:content.capitalize="capitalizeValue" />
        <div class="border-b border-[#00000011] min-w-200px py-1 text-#333 capitalize-result">
          Value: "{{ capitalizeValue }}"
        </div>
      </div>
    </div>
  `
}
