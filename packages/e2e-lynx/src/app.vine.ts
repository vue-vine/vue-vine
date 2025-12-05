import type { MainThread, ScrollEvent } from '@lynx-js/types'
import { computed, ref } from '@vue-vine/runtime-lynx'

function BackgroundDraggable() {
  const posStyle = ref({ x: 0, y: 500 })

  const onScroll = (event: ScrollEvent) => {
    const detail = event.detail.scrollTop
    posStyle.value = {
      x: 0,
      y: 500 - detail,
    }
  }

  const style = computed(() => ({
    height: `100px`,
    width: `100px`,
    background: 'lightskyblue',
    transform: `translate(${posStyle.value.x}px, ${posStyle.value.y}px)`,
  }))

  return vine`
    <view global-target="scroll" :global-bindscroll="onScroll" :style="style">
      <text>BGDraggable</text>
    </view>
  `
}

function MainThreadDraggable() {
  const onScroll = (event: MainThread.TouchEvent & ScrollEvent) => {
    'main thread'

    const detail = event.detail.scrollTop
    event.currentTarget.setStyleProperty(
      'transform',
      `translate(0, ${500 - detail}px)`,
    )
  }
  const style = computed(() => ({
    height: `100px`,
    width: `100px`,
    background: 'lightskyblue',
    transform: 'translate(0px, 500px)',
  }))

  return vine`
    <view global-target="scroll" :main-thread:global-bindscroll="onScroll" :style="style">
      <text>MTDraggable</text>
    </view>
  `
}

function TestMainThreadEvent() {
  const onContainerScroll = () => {}

  return vine`
    <view style="display: linear; linear-direction: row; width: 100%; height: 100%">
      <scroll-view
        id="scroll"
        :bindscroll="onContainerScroll"
        scroll-orientation="vertical"
        style="display: linear; width: 50%; height: 100%"
      >
        <view style="background: yellow; width: 100%; height: 500px" />
        <view style="background: lightskyblue; width: 100%; height: 100px" />
        <view style="background: yellow; width: 100%; height: 1000px" />
      </scroll-view>
      <view style="width: 50%; height: 100%; display: linear; linear-direction: row">
        <MainThreadDraggable />
        <BackgroundDraggable />
      </view>
    </view>
  `
}

function TestTapEvent() {
  const count = ref(0)
  const onTap = () => {
    count.value++
  }

  return vine`
    <view :style="{ backgroundColor: 'lightskyblue', padding: '10px' }" :bindtap="onTap">
      <text>Tap me +1 / count = {{ count }}</text>
    </view>
  `
}

const containerStyle = {
  display: 'flex',
  height: '100vh',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
} as const
const sectionTitleStyle = {
  fontSize: '12px',
  color: '#666',
  marginTop: '20px',
  marginBottom: '8px',
} as const

// Main App
export function App() {
  return vine`
    <view :style="containerStyle">
      <text :style="sectionTitleStyle">Tap Event Test</text>
      <TestTapEvent />
      <text :style="sectionTitleStyle">Main Thread Event Test</text>
      <TestMainThreadEvent />
    </view>
  `
}
