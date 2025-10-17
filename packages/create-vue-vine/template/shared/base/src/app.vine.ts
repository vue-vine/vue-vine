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
      </header>

      <main class="main flex h-full">
        <div
          class="slogan flex items-center justify-center flex-col px-4 pb-4 text-lg mx-auto max-w-content"
        >
          <div class="slogan-logo">
            <img :src="VineLogo" alt="Vine Logo" width="128" height="128" />
          </div>
          <h2 class="font-medium my-2">Another style to write Vue</h2>
          <p class="text-sm">Provide more flexibility for writing Vue components.</p>
        </div>
      </main>
    </div>
  `
}
