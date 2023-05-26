import { createApp } from 'vue'
import './styles/main.css'

async function loadSFC() {
  const sfcApp = await import('./sfc/App.vue')
  const app = createApp(sfcApp.default)
  app.mount('#app')
}

async function loadVine() {
  const { App: VineApp } = await import('./vine/app.vine')
  const app = createApp(VineApp)
  app.mount('#app')
}

if (location.search.includes('sfc')) {
  loadSFC()
}
else {
  loadVine()
}
