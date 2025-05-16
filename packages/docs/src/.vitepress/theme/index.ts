import type { App } from 'vue'
import Theme from 'vitepress/theme'
import { h } from 'vue'
import Recommend from './components/recommend.vue'
import Sponsors from './components/sponsors.vue'
import VersionTip from './components/version-tip.vue'

import 'uno.css'
import './style.css'

export default {
  ...Theme,
  Layout() {
    return h(Theme.Layout, null)
  },
  enhanceApp({ app }: { app: App }) {
    app.component('Sponsors', Sponsors)
    app.component('Recommend', Recommend)
    app.component('VersionTip', VersionTip)
  },
}
