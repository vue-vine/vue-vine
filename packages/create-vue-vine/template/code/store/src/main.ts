import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { App as VineApp } from './app.vine'

import './styles/main.css'

const app = createApp(VineApp)

app.use(createPinia())
app.mount('#app')
