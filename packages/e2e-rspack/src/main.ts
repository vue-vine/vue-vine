import { createApp } from 'vue'
import { App } from './app.vine'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
