import type { App } from 'vue'
import { h } from 'vue'
import Theme from 'vitepress/theme'
import 'uno.css'
import './style.css'

import Sponsors from './components/sponsors.vue'
import Recommend from './components/recommend.vue'

export default {
  ...Theme,
  Layout() {
    return h(Theme.Layout, null)
  },
  enhanceApp({ app }: { app: App }) {
    app.component('Sponsors', Sponsors)
    app.component('Recommend', Recommend)
  },
}
