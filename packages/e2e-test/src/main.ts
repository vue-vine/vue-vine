import { createApp } from 'vue'
import { App as VineApp } from './test.vine'

const app = createApp(VineApp)
app.mount('#app')
