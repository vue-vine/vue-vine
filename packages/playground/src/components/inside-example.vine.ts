export function InsideExample() {
  const title = vineProp<string>(value => value.startsWith('#'))
  const author = vineProp.withDefault('Anonymous')
  const emits = vineEmits<{ metaBgColorChange: [string] }>()

  const isDark = useDark()
  const defaultMetaBgColor = computed(() => isDark.value ? '#333' : '#ddd')
  const metaBgColor = ref(defaultMetaBgColor.value)
  const toggleMetaBgColor = () => {
    const nextBgColor = (
      metaBgColor.value === defaultMetaBgColor.value
        ? '#59e'
        : defaultMetaBgColor.value
    )
    metaBgColor.value = nextBgColor
    emits('metaBgColorChange', nextBgColor)
  }
  watch(isDark, () => {
    metaBgColor.value = defaultMetaBgColor.value
  })

  vineStyle.scoped(scss`
    .playground-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .playground-meta {
      display: flex;
      flex-direction: column;
      margin: 8px 0;
      padding: 6px;
      background-color: v-bind(metaBgColor);
      border-radius: 6px;
    }
    .playground-meta-line {
      padding: 6px 0;
    
      &.change-bg {
        cursor: pointer;
        user-select: none;
      }
    }
    .playground-meta-span {
      margin: 0 8px;
    }
  `)

  vineExpose({
    metaBgColor,
  })

  return vine`
    <header>
      <div class="playground-title">
        {{ title }}
      </div>
      <div class="playground-meta">
        <div class="playground-meta-line">
          <span class="playground-meta-span">
            <strong>Author: </strong>{{ author }}
          </span>
          <span class="playground-meta-span">
            <strong>Today: </strong>{{ new Date().toLocaleDateString() }}
          </span>
        </div>
        <div class="playground-meta-line change-bg" @click="toggleMetaBgColor()">
          <span class="playground-meta-span">
            Click this line to toggle this card's background color!
          </span>
        </div>
      </div>
    </header>
  `
}
