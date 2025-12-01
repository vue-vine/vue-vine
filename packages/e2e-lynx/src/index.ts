import { createLynxApp } from '@vue-vine/runtime-lynx'
import { h, ref } from 'vue'

const App = {
  setup() {
    const num = ref(0)

    setInterval(() => {
      num.value += 1
    }, 1000)

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
        }, `Hello from Vue Vine! num = ${num.value}`),
      ])
    )
  },
}

// Standard Vue API usage
const app = createLynxApp(App)
app.mount()
