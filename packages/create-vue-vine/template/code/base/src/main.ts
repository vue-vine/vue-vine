import { createApp } from 'vue'
import { App as VineApp } from './app.vine'

import './styles/main.css'

const app = createApp(VineApp)
app.mount('#app')
