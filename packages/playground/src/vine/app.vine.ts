import { PostHeader } from './post-header.vine'
import { randomString } from '~/utils'

function BlogPost(props: {
  id: string
}) {
  vineStyle.scoped(scss`
    .loading-view {
      margin: 1rem 0;
    }
    .blog-post-meta {
      margin-top: 16px;
      font-style: italic;
    }
    .blog-post-meta-title {
      margin: 0.5rem 0;
      font-weight: bold;
      opacity: 0.8;
    }
  `)

  const blogMeta = ref('')
  const loading = ref(true)
  const mockPostUpdate = () => {
    loading.value = true
    setTimeout(() => {
      loading.value = false
      blogMeta.value = `Post #${props.id} - ${randomString(30)}`
    }, 2000)
  }

  // Mock result of a network request
  watch(() => props.id, () => {
    mockPostUpdate()
  }, { immediate: true })

  return vine`
    <article>
      <PostHeader title="Vue Vine Playground" author="ShenQingchuan" />
      <div class="blog-post-meta-title text-lime-800/50 dark:text-#999">
        Blog post meta:
      </div>
      <div v-if="loading" class="loading-view">
        <div class="icon-loading" />
        <span>Loading...</span>
      </div>
      <p v-else class="blog-post-meta">
        {{ blogMeta }}
      </p>
    </article>
  `
}

export function App() {
  const id = ref('1')
  const isDark = useDark()
  const toggleDark = useToggle(isDark)
  const randomPick = () => {
    id.value = String(Math.floor(Math.random() * 100) + 1)
  }

  // eslint-disable-next-line no-console
  console.log('Click the link to explore source code ->')

  vineStyle(`
    .random-pick-post-btn {
      font-size: 1rem;
      background: #334155c6;
      border-radius: 0.25rem;
      color: #fff;
      padding: 0.5rem 1rem;
      border: none;
      outline: none;
      cursor: pointer;
    }
  `)

  return vine`
    <div class="flex flex-row items-center justify-center mb-4">
      <div
        class="mr-2 text-8 cursor-pointer"
        :class="[
          isDark ? 'i-carbon:moon' : 'i-carbon:sun'
        ]"
        @click="toggleDark()"
      />
      <button class="random-pick-post-btn" @click="randomPick">
        Random pick a post
      </button>
    </div>
    <BlogPost :id="id" />
  `
}
