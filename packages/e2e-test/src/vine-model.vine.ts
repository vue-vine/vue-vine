import { ref } from 'vue'
import './styles/atom.css'

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

export function TestVineModel() {
  const simpleMsg = ref('')
  const specialMsg = ref('')

  vineStyle.scoped(`
    .container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .container input {
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

      <NamedModelInput v-model="specialMsg" />
      <div class="row-flex">
        Named Model Input:
        <div class="show-msg special-msg">{{ specialMsg }}</div>
      </div>
    </div>
  `
}
