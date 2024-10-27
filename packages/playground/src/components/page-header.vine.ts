import { useRouter, useRoute } from 'vue-router'

export function PageHeader() {
  const route = useRoute()
  const router = useRouter()

  const handleNavBtnClick = (
    target: '/about' | '/style-order' | '/todolist'
  ) => {
    router.push(
      route.path === target
        ? '/'
        : target
    )
  }

  return vine`
    <div
      class="
        w-full px-4 py-6 border-b-1px border-b-solid
        border-b-coolgray-300:50
        dark:border-b-coolgray-100:20
        flex items-center fixed top-0
      "
    >
      <h2>Vine playground</h2>

      <div
        class="
          ml-auto px-4 py-2 rounded
          bg-teal-700:20 dark:bg-coolgray-100:20
          cursor-pointer
        "
        @click="handleNavBtnClick('/style-order')"
      >
        <span>
          {{ route.path === '/style-order' ? 'Go Home' : 'TestStyleOrder'}}
        </span>
      </div>
      <div
        class="
          ml-2 px-4 py-2 rounded
          bg-teal-700:20 dark:bg-coolgray-100:20
          cursor-pointer
        "
        @click="handleNavBtnClick('/about')"
      >
        <span>
          {{ route.path === '/about' ? 'Go Home' : 'About'}}
        </span>
      </div>
      <div
        class="
          ml-2 px-4 py-2 rounded
          bg-teal-700:20 dark:bg-coolgray-100:20
          cursor-pointer
        "
        @click="handleNavBtnClick('/todolist')"
      >
        <span>
          TodoList
        </span>
      </div>

    </div>
  `
}
