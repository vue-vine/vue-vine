import { createLynxApp, defineComponent, h, ref } from '@vue-vine/runtime-lynx'

const TestComp = defineComponent({
  props: {
    msg: { type: String, required: true },
  },
  setup(props) {
    const num = ref(0)

    setInterval(() => {
      num.value += 1
    }, 1000)

    return () => (
      h('text', {
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
        },
      }, `num = ${num.value}, msg = ${props.msg}`)
    )
  },
})

const App = defineComponent({
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
        h(TestComp, {
          msg: 'Hello from Vue Vine!',
        }),
      ])
    )
  },
})

// Standard Vue API usage
const app = createLynxApp(App)
app.mount()
