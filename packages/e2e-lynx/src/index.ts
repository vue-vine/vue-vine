import { createLynxApp } from '@vue-vine/runtime-lynx'
import { h } from 'vue'

const App = {
  setup() {
    return () => (
      h('view', {
        style: {
          'display': 'flex',
          'height': '100vh',
          'flex-direction': 'column',
          'justify-content': 'center',
          'align-items': 'center',
        },
      }, [
        h('text', {
          style: {
            'font-size': '16px',
            'font-weight': 'bold',
          },
        }, 'Hello from Vue Vine!'),
      ])
    )
  },
}

// Standard Vue API usage
const app = createLynxApp(App)
app.mount()
