import { ref } from '@vue-vine/runtime-lynx'

function TestReactiveEffect(props: {
  msg: string
}) {
  const num = ref(0)

  setInterval(() => {
    num.value += 1
  }, 1000)

  return vine`
    <view>
      <text style="font-size: 16px; font-weight: bold"> num = {{ num }}, msg = {{ msg }} </text>
    </view>
  `
}

function TestEventDispatch() {
  const count = ref(0)
  const onTap = () => {
    count.value++
  }

  return vine`
    <view :bindtap="onTap" style="display: flex; flex-direction: column; align-items: center">
      <view style="margin-top: 1rem; padding: 1rem; background-color: gold; border-radius: 0.25rem">
        <text>Tap me +1 / count = {{ count }}</text>
      </view>
    </view>
  `
}

export function App() {
  return vine`
    <view
      style="
        display: flex;
        height: 100vh;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      "
    >
      <TestReactiveEffect msg="Hello from Vue Vine!" />
      <TestEventDispatch />
    </view>
  `
}
