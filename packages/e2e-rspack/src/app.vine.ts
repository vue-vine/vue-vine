export function App() {
  vineStyle(`
    * {
      margin: 0;
      padding: 0;
    }
    .app {
      padding: 5rem 0;
    }
    .nav-links {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .nav-link {
      width: max-content;
      text-decoration: none;
      color: cadetblue;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      background-color: #dddddd55;
    }
    .nav-link:hover {
      color: #3451b2;
    }
  `)

  return vine`
    <div class="app">
      <nav class="nav-links">
        <router-link class="nav-link" to="/hmr">HMR Test</router-link>
        <router-link class="nav-link" to="/vine-prop">Vine Prop</router-link>
        <router-link class="nav-link" to="/ts-morph-complex-external"
          >Ts Morph Complex External</router-link
        >
        <router-link class="nav-link" to="/style-order">Style Order</router-link>
        <router-link class="nav-link" to="/external-style-import">External Style Import</router-link>
        <router-link class="nav-link" to="/transform-asset-url">Transform Asset URL</router-link>
      </nav>

      <router-view />
    </div>
  `
}
