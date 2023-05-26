import { h } from 'vue'
import Theme from 'vitepress/theme'
import './style.css'

export default {
  ...Theme,
  Layout() {
    return h(Theme.Layout, null)
  },
}
