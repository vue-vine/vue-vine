import { createApp } from 'vue'
import { E2EApp } from './app.vine'
import router from './router'

const app = createApp(E2EApp)
app.use(router)
app.mount('#app')
