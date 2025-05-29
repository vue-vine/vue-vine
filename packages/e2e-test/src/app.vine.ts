const routes = [
  { path: '/hmr', label: 'HMR' },
  { path: '/style-order', label: 'Style Order' },
  { path: '/external-style-import', label: 'External Style Import' },
  { path: '/transform-asset-url', label: 'Transform Asset Url' },
  { path: '/props-destructure', label: 'Props Destructure' },
  { path: '/vibe', label: 'Vibe' },
  { path: '/use-defaults', label: 'Use Defaults' },
]

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
      <li v-for="route in routes" :key="route.path" class="e2e-test-nav-item">
        <router-link :to="route.path">{{ route.label }}</router-link>
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
