const routes = [
  { path: '/hmr', label: 'HMR' },
  { path: '/style-order', label: 'Style Order' },
  { path: '/external-style-import', label: 'External Style Import' },
  { path: '/transform-asset-url', label: 'Transform Asset Url' },
  { path: '/props-destructure', label: 'Props Destructure' },
  { path: '/vibe', label: 'Vibe' },
  { path: '/use-defaults', label: 'Use Defaults' },
  { path: '/vine-model', label: 'Vine Model' },
  { path: '/vine-validators', label: 'Vine Validators' },
  { path: '/todo-list', label: 'Todo List' },
  { path: '/mix-with-jsx', label: 'Mix With JSX' },
  { path: '/ts-morph-complex-external', label: 'Ts Morph Complex External' },
  { path: '/vine-prop', label: 'vineProp macro' },
]

export function NavList() {
  vineStyle.scoped(`
    .e2e-test-nav {
      width: fit-content;
      display: flex;
      flex-direction: row;
      gap: 1rem;
      list-style: none;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .e2e-test-nav-item {
      cursor: pointer;
      padding: 0.25rem 1rem;
      background-color: #dddddd55;
      white-space: nowrap;
    }
    .e2e-test-nav-item:hover {
      background-color: #aaaaaa55;
    }
    .e2e-test-nav-item a {
      display: block;
      width: 100%;
      text-decoration: none;
      color: cadetblue;
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

export function App() {
  return vine`
    <NavList />
    <router-view />
  `
}
