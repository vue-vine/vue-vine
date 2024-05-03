
export function App() {

  return vine`
    <div class="container">
      <h1>Vue Vine</h1>

      <ul>
        <li><router-link to="/">Home</router-link></li>
        <li><router-link to="/about">About</router-link></li>
      </ul>

      <router-view></router-view>
    </div>
  `
}
