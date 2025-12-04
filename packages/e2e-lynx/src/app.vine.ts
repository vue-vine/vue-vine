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
    const newPos = {
      x: 0,
      y: 500 - detail,
    }
    event.currentTarget.setStyleProperty(
      'transform',
      `translate(${newPos.x}px, ${newPos.y}px)`,
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

// Main App
export function App() {
  return vine`
    <view
      :style="{
        display: 'flex',
        height: '100vh',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }"
    >
      <text
        :style="{
          fontSize: '12px',
          color: '#666',
          marginTop: '20px',
          marginBottom: '8px',
        }"
        >Main Thread Event Test</text
      >
      <TestMainThreadEvent />
    </view>
  `
}
