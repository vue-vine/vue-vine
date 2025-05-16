import { createApp } from 'vue'
import { App as VineApp } from './app.vine'

import './styles'

const app = createApp(VineApp)

app.mount('#app')
