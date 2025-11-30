import { createApp } from '@vue-vine/runtime-lynx'
import { h } from 'vue'

const App = {
  setup() {
    return () => (
      h('view', null, [
        h('text', null, 'Hello from Vue Vine!'),
      ])
    )
  },
}

createApp(App)
