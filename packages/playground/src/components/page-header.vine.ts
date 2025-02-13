import { useRoute, useRouter } from 'vue-router'

function NavBtn(props: {
  path: string
}) {
  const route = useRoute()
  const router = useRouter()
  const handleNavBtnClick = (
    target: string,
  ) => {
    router.push(
      route.path === target
        ? '/'
        : target,
    )
  }

  return vine`
    <div
      class="ml-2 px-4 py-2 rounded whitespace-nowrap bg-teal-700:20 dark:bg-coolgray-100:20 cursor-pointer"
      @click="handleNavBtnClick(path)"
    >
      <span>
        {{ route.path === path ? "Go Home" : path.slice(1) }}
      </span>
    </div>
  `
}

export function PageHeader() {
  return vine`
    <div
      class="w-full px-4 py-6 border-b-1px border-b-solid border-b-coolgray-300:50 dark:border-b-coolgray-100:20 flex items-center fixed top-0"
    >
      <h2 class="mr-4">Vine playground</h2>
      <NavBtn path="/style-order" />
      <NavBtn path="/about" />
      <NavBtn path="/todolist" />
      <NavBtn path="/test-ts-morph" />
      <NavBtn path="/vapor" />
    </div>
  `
}
