import VineLogo from '@/assets/vine-logo.png'

export function App() {
  vineStyle.scoped(`
    .container {
      padding: 3rem 6rem;
      height: 100%;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1rem;
    }

    .header h1 {
      font-weight: 500;
      font-size: 1.25rem;
    }

    .nav-menu {
      display: flex;
      gap: .5rem;
      font-weight: 500;
      font-family: sans-serif;
      font-size: .875rem;
      letter-spacing: .025em;
    }

    .nav-menu a {
      padding: .413rem 1rem;
    }

    .nav-menu a:hover {
      border-radius: .25rem;
      background-color: #f2f3fa;
      color: #5672cd;
    }

    .nav-menu a:active {
      background-color: #e6e7f5;
    }

    a.router-link-exact-active {
      color: #3451b2;
    }

    .main {
      display: flex;
      height: 100%;
    }

    .slogan {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding-inline: 4rem;
      padding-bottom: 4rem;
      font-size: 1.68em;
      text-wrap: pretty;
    }

    .slogan h2 {
      font-weight: 500;
      margin-block: .5rem;
    }

    .slogan p {
      font-size: .875em;
    }
  `)

  return vine`
    <div class="container">
      <header class="header">
        <h1>Vue Vine</h1>

        <nav class="nav-menu">
          <router-link to="/">Home</router-link>
          <router-link to="/about">About</router-link>
        </nav>
      </header>

      <main class="main">
        <div class="slogan">
          <div class="slogan-logo">
            <img :src="VineLogo" alt="Vine Logo" width="128" height="128" />
          </div>

          <h2>Another style to write Vue</h2>
          <p>Provide more flexibility for writing Vue components.</p>
        </div>
      </main>
    </div>
  `
}
