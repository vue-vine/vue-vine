function PostHeader() {
  const title = vineProp<string>(value => value.startsWith('#'))
  const author = vineProp.withDefault('Anonymous')

  vineStyle.scoped(`
    .blog-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .blog-meta-item {
      margin-right: 8px;
    }
  `)

  return vine`
    <header>
      <div class="blog-title">
        {{ title }}
      </div>
      <div class="blog-meta">
        <span class="blog-meta-item">
          <strong>Author: </strong>{{ author }}</span>
        <span class="blog-meta-item">
          <strong>Published: </strong>{{ new Date().toLocaleDateString() }}</span>
      </div>
    </header>
  `
}

function BlogPost(props: {
  id: string
}) {
  vineStyle.scoped(scss`
    .loading-view {
      margin: 1rem 0;
    }
    .blog-post-abstract {
      margin-top: 16px;
      font-style: italic;
    }
    .blog-post-abstract-title {
      margin: 0.5rem 0;
      font-weight: bold;
      opacity: 0.8;
    }
  `)

  const loading = ref(true)
  const abstract = ref('')
  const mockPostUpdate = () => {
    loading.value = true
    setTimeout(() => {
      loading.value = false
      abstract.value = `Something for post #${props.id}...`
    }, 2000)
  }

  // Mock result of a network request
  watch(() => props.id, () => {
    mockPostUpdate()
  }, { immediate: true })

  return vine`
    <article>
      <PostHeader title="Vue Vine Playground" author="ShenQingchuan" />
      <div class="blog-post-abstract-title">
        Blog post abstract:
      </div>
      <div v-if="loading" class="loading-view">
        <div class="icon-loading" />
        <span>Loading...</span>
      </div>
      <p v-else class="blog-post-abstract">
        {{ abstract }}
      </p>
    </article>
  `
}

export function App() {
  const id = ref('1')
  const randomPick = () => {
    id.value = String(Math.floor(Math.random() * 100) + 1)
  }

  vineStyle(`
    .random-pick-post-btn {
      margin-bottom: 1rem;
      font-size: 1rem;
      background: #334155;
      border-radius: 0.25rem;
      color: #fff;
      padding: 0.5rem 1rem;
      border: none;
      outline: none;
      cursor: pointer;
    }
  `)

  return vine`
    <button class="random-pick-post-btn" @click="randomPick">
      Random pick a post
    </button>
    <BlogPost :id="id" />
  `
}
