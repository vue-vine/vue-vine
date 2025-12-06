import { createLynxApp } from '@vue-vine/runtime-lynx'

import { App } from './app.vine'
// import { App } from './simple-demo'
// import { App } from './simple.vine'

// Create and mount app
const app = createLynxApp(App)
app.mount()
