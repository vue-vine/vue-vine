export function NavList() {
  vineStyle.scoped(`
    .e2e-test-nav {
      width: fit-content;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .e2e-test-nav-item {
      cursor: pointer;
    }
    .e2e-test-nav-item:hover {
      background-color: #f0f0f0;
    }
    .e2e-test-nav-item a {
      display: block;
      width: 100%;
      text-decoration: none;
      color: inherit;
    }
  `)

  return vine`
    <ul class="e2e-test-nav">
      <li class="e2e-test-nav-item">
        <router-link to="/hmr">HMR</router-link>
      </li>
      <li class="e2e-test-nav-item">
        <router-link to="/style-order">Style Order</router-link>
      </li>
      <li class="e2e-test-nav-item">
        <router-link to="/external-style-import">External Style Import</router-link>
      </li>
      <li class="e2e-test-nav-item">
        <router-link to="/transform-asset-url">Transform Asset Url</router-link>
      </li>
    </ul>
  `
}

export function E2EApp() {
  return vine`
    <NavList />
    <router-view />
  `
}
