import { PageHeader } from '../components/page-header.vine'
import { InsideExample } from '../components/inside-example.vine'
import { generateRandomString } from '~/utils'

function OutsideExample(props: { id: string }) {
  vineStyle.scoped(scss`
    .loading-view {
      margin: 1rem 0;
    }
    .state-container-meta {
      margin-top: 16px;
      font-style: italic;
    }
    .state-container-title {
      margin: 0.5rem 0;
      font-weight: bold;
      opacity: 0.8;
    }
  `)

  const randomStr = ref('')
  const loading = ref(true)
  const mockUpdate = () => {
    loading.value = true
    setTimeout(() => {
      loading.value = false
      randomStr.value = generateRandomString(30)
    }, 2000)
  }

  // Mock result of a network request
  watch(() => props.id, () => {
    mockUpdate()
  }, { immediate: true })

  return vine`
    <div class="state-container">
      <InsideExample
        title="Here's a title"
        author="ShenQingchuan"
        @metaBgColorChange="(color: string) => console.log(color)"
      />

      <div class="state-container-title text-lime-800/50 dark:text-#999">
        Random string:
      </div>

      <div v-if="loading" class="loading-view">
        <div class="icon-loading" />
        <span>Loading...</span>
      </div>
      <p v-else class="state-container-meta">
        {{ randomStr }}
      </p>
    </div>
  `
}

export function Home() {
  const id = ref('1')
  const isDark = useDark()
  const toggleDark = useToggle(isDark)
  const randomState = () => {
    id.value = String(Math.floor(Math.random() * 100) + 1)
  }
  const userInputText = vineModel<string>()

  console.log('%c VINE %c Click the link to explore source code ->', 'background: green;', '')

  vineStyle(`
    .random-state-change-btn {
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
    <PageHeader />
    <OutsideExample :id="id" />
    <div class="flex flex-row items-center justify-center my-4">
      <div
        :class="[
          isDark ? 'i-carbon:moon' : 'i-carbon:sun',
          'mr-2 text-6 cursor-pointer']
        "
        @click="toggleDark()"
      />
      <button class="random-state-change-btn" @click="randomState">
        Click to change random string
      </button>
    </div>
    <div class="flex flex-col items-center justify-center my-4">
      <p class="my-4">{{ userInputText || 'Please input something here...' }}</p>
      <input
        type="text"
        class="
          bg-blueGray-200:80 dark:bg-coolgray-400:20
          dark:caret-light border-none outline-none p-2
          dark:text-light rounded w-300px
        "
        v-model="userInputText"
      />
    </div>
  `
}
