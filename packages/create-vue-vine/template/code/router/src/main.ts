import { createApp } from 'vue'
import router from './router'
import { App as VineApp } from './app.vine'

import './styles/main.css'

const app = createApp(VineApp)
app.use(router)
app.mount('#app')
