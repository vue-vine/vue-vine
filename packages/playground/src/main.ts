import { createPinia } from 'pinia'
import { createApp, vaporInteropPlugin } from 'vue'
import { App as VineApp } from './app.vine'
import router from './router'
// UnoCSS
import 'virtual:uno.css'
import './styles/main.css'

const pinia = createPinia()

const app = createApp(VineApp)
app.use(pinia)
app.use(router)
app.use(vaporInteropPlugin)
app.mount('#app')
