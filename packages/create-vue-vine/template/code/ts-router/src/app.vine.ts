
export function App() {

  return vine`
    <div class="container">
      <h1>Vue Vine</h1>
      <router-link to="/">Home</router-link>
      <router-link to="/about">About</router-link>

      <router-view></router-view>
    </div>
  `
}
