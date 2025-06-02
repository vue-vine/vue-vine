import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { App } from './app.vine'
import router from './router'

import 'virtual:uno.css'
import './styles/main.css'

const pinia = createPinia()
const app = createApp(App)

app.use(router)
app.use(pinia)
app.mount('#app')
