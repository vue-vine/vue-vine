import { defineComponent, h } from '@vue-vine/runtime-lynx'

export const App = defineComponent({
  setup() {
    return () => (
      h(
        'view',
        {
          style: {
            display: 'flex',
            height: '100vh',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          },
        },
        h(
          'text',
          null,
          'Hello Vue Vine on Lynx',
        ),
      )
    )
  },
})
