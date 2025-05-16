import { createApp } from 'vue'
import { App as VineApp } from './app.vine'
import router from './router'

import './styles'

const app = createApp(VineApp)

app.use(router)
app.mount('#app')
