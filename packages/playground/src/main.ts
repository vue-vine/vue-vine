import { createApp } from 'vue'
import { App as VineApp } from './vine/test.vine'

// UnoCSS
import 'virtual:uno.css'

import './styles/main.css'

const app = createApp(VineApp)
app.mount('#app')

// const css = '#.class { color: blue}#'
