import { createLynxApp } from '@vue-vine/runtime-lynx'

import { App } from './app.vine'
// import { App } from './simple-demo'

// Create and mount app
const app = createLynxApp(App)
app.mount()
