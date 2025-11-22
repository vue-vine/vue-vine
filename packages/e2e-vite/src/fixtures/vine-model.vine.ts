import { ref } from 'vue'
import '../styles/atom.css'

export function SimpleInput() {
  const value = vineModel()

  return vine`
    <input class="simple-input" type="text" v-model="value" />
  `
}
export function NamedModelInput() {
  const value = vineModel('special')

  return vine`
    <input class="special-input" type="text" v-model="value" />
  `
}

export function AccessorModelInput() {
  const value = vineModel<number>({
    default: 0,
    get(value) {
      console.log('getter: ', value)
      return value
    },
    set(value) {
      return value * 2
    },
  })

  return vine`
    <button class="accessor-button" @click="value += 1">+1</button>
  `
}

export function TestVineModel() {
  const simpleMsg = ref('')
  const specialMsg = ref('')
  const accessorValue = ref(0)

  vineStyle.scoped(`
    .container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .container input, .accessor-button {
      width: 200px;
      background-color: #f0f0f0;
      border: none;
      outline: none;
      padding: 0.5rem;
      box-shadow: 0 0 0 1px #00000011;
    }
    .show-msg {
      border-bottom: 1px solid #00000011;
      min-width: 200px;
      margin-left: 1rem;
    }
  `)

  return vine`
    <div class="container">
      <h2>Test Vine Model</h2>

      <SimpleInput v-model="simpleMsg" />
      <div class="row-flex">
        Simple Input:
        <div class="show-msg simple-msg">{{ simpleMsg }}</div>
      </div>

      <NamedModelInput v-model:special="specialMsg" />
      <div class="row-flex">
        Named Model Input:
        <div class="show-msg special-msg">{{ specialMsg }}</div>
      </div>

      <AccessorModelInput v-model="accessorValue" />
      <div class="row-flex">
        Accessor Model Button:
        <div class="show-msg accessor-value">{{ accessorValue }}</div>
      </div>
    </div>
  `
}
