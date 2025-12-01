import { createLynxApp } from '@vue-vine/runtime-lynx'
import { h } from 'vue'

const App = {
  setup() {
    return () => (
      h('view', {
        style: {
          // Both camelCase and kebab-case are supported
          display: 'flex',
          height: '100vh',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        },
      }, [
        h('text', {
          style: {
            fontSize: '16px',
            fontWeight: 'bold',
          },
        }, 'Hello from Vue Vine!'),
      ])
    )
  },
}

// Standard Vue API usage
const app = createLynxApp(App)
app.mount()
