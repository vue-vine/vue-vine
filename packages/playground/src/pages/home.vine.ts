import { generateRandomString } from '~/utils'

// No need to manually import the following components,
// they will be automatically imported
// - import { InsideExample } from '../components/inside-example.vine'

function OutsideExample(props: { id: string }) {
  const randomStr = ref('')
  const loading = ref(true)
  const title = ref('Here is a title')
  const mockUpdate = () => {
  loading.value = true
    setTimeout(() => {
      loading.value = false
      randomStr.value = generateRandomString(30)
    }, 2000)
  }

  vineStyle(scss`
    .loading-view {
      margin: 1rem 0;
    }
  `)
  vineStyle.import.scoped('~/styles/outside-example.css')


  // Mock result of a network request
  watch(() => props.id, () => {
    mockUpdate()
  }, { immediate: true })

  return vine`
    <div class="state-container">
      <InsideExample
        :title
        author="Tom"
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

function RandomStringButton() {
  const emit = vineEmits<{
    tap: [number, number],
    move?: [number, number, number]
  }>()
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

  // const emit = vineEmits(['tap', 'move'])

  const onBtnTap = (event: MouseEvent) => {
    const mouseX = event.clientX
    const mouseY = event.clientY
    emit('tap', mouseX, mouseY)
  }

  return vine`
    <button class="random-state-change-btn" @click="onBtnTap">
      Click to change random string
    </button>
  `
}

export function HomePage() {
  const id = ref('1')
  const isDark = useDark()
  const toggleDark = useToggle(isDark)
  const randomState = () => {
    id.value = String(Math.floor(Math.random() * 100) + 1)
  }
  const userInputText = ref('')

  console.log('%c VINE %c Click the link to explore source code ->', 'background: green;', '')

  return vine`
    <PageHeader />
    <OutsideExample :id="id" />
    <div class="flex flex-row items-center justify-center my-4">
      <div
        :class="[
          isDark ? 'i-carbon:moon' : 'i-carbon:sun',
          'mr-2 text-6 cursor-pointer',
        ]"
        @click="toggleDark()"
      />
      <RandomStringButton @tap="randomState" />
    </div>
    <div class="flex flex-col items-center justify-center my-4">
      <p class="my-4">{{ userInputText || "Please input something here..." }}</p>
      <input
        type="text"
        class="bg-blueGray-200:80 dark:bg-coolgray-400:20 dark:caret-light border-none outline-none p-2 dark:text-light rounded w-300px"
        v-model="userInputText"
      />
    </div>
  `
}
