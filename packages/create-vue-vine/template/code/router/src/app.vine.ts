import VineLogo from '@/assets/vine-logo.png'

export function App() {
  vineStyle.scoped(`
    .slogan {
      text-wrap: pretty;
    }
  `)

  return vine`
  <div class="max-w-screen-lg mx-auto h-full px-12 py-24">
    <header class="header flex justify-between items-center pb-4">
      <h1 class="font-medium text-lg">Vue Vine</h1>

      <nav
        class="nav-menu flex gap-2 font-medium font-sans text-sm tracking-tight"
      >
          <router-link
            class="px-4 py-1 transition-colors rounded-md hover:bg-[#88888828] active:bg-[#88888850]"
            active-class="text-[#3451b2] dark:text-[#5777e2]"
            to="/"
          >
            Home
          </router-link>
          <router-link
            class="px-4 py-1 transition-colors rounded-md hover:bg-[#88888828] active:bg-[#88888850]"
            active-class="text-[#3451b2] dark:text-[#5777e2]"
            to="/about"
          >
            About
          </router-link>
        </nav>
      </header>

      <main class="main flex h-full">
        <div
          class="slogan flex items-center justify-center flex-col px-4 pb-4 text-lg mx-auto max-w-content"
        >
          <div class="slogan-logo">
            <img :src="VineLogo" alt="Vine Logo" width="128" height="128" />
          </div>
          <h2 class="font-medium my-2">Another style to write Vue</h2>
          <p class="text-sm">
            Provide more flexibility for writing Vue components.
          </p>
        </div>

        <div class="content flex-1 p-4">
          <router-view />
        </div>
      </main>
    </div>
`
}
