import { defineComponent, h, ref } from '@vue-vine/runtime-lynx'

const TestReactiveEffect = defineComponent({
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

const TestEventDispatch = defineComponent({
  setup() {
    const count = ref(0)
    const onTap = () => {
      count.value++
    }

    return () => (
      h('view', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        },
      }, [
        h ('view', {
          bindtap: onTap,
          style: {
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'gold',
            borderRadius: '0.25rem',
          },
        }, h(
          'text',
          null,
          `Tap me +1 / count = ${count.value}`,
        )),
      ])
    )
  },
})

export const App = defineComponent({
  setup() {
    return () => (
      h('view', {
        style: {
          display: 'flex',
          height: '100vh',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        },
      }, [
        h(TestReactiveEffect, {
          msg: 'Hello from Vue Vine!',
        }),
        h(TestEventDispatch),
      ])
    )
  },
})
