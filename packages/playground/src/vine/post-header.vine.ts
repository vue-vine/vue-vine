export function PostHeader() {
  const title = vineProp<string>(value => value.startsWith('#'))
  const author = vineProp.withDefault('Anonymous')

  const isDark = useDark()
  const defaultMetaBgColor = computed(() => isDark.value ? '#333' : '#ddd')
  const metaBgColor = ref(defaultMetaBgColor.value)
  const toggleMetaBgColor = () => {
    metaBgColor.value = metaBgColor.value === defaultMetaBgColor.value
      ? '#59e'
      : defaultMetaBgColor.value
  }
  watch(isDark, () => {
    metaBgColor.value = defaultMetaBgColor.value
  })

  vineStyle.scoped(`
    .blog-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .blog-meta {
      display: flex;
      flex-direction: column;
      margin: 8px 0;
      padding: 6px;
      background-color: v-bind(metaBgColor);
      border-radius: 6px;
    }
    .blog-meta-line {
      padding: 6px 0;
    }
    .blog-meta-line.change-bg {
      cursor: pointer;
      user-select: none;
    }
    .blog-meta-span {
      margin: 0 8px;
    }
  `)

  vineExpose({
    metaBgColor,
  })

  return vine`
    <header>
      <div class="blog-title">
        {{ title }}
      </div>
      <div class="blog-meta">
        <div class="blog-meta-line">
          <span class="blog-meta-span">
            <strong>Author: </strong>{{ author }}
          </span>
          <span class="blog-meta-span">
            <strong>Published: </strong>{{ new Date().toLocaleDateString() }}
          </span>
        </div>
        <div class="blog-meta-line change-bg" @click="toggleMetaBgColor()">
          <span class="blog-meta-span">
            Click this line to toggle this card's background color change!
          </span>
        </div>
      </div>
    </header>
  `
}
