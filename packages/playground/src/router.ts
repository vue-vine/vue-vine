import { createRouter, createWebHistory } from 'vue-router'
import { Home } from './pages/home.vine'
import { About } from './pages/about.vine'
import { StyleOrder } from './pages/style-order.vine'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/style-order', component: StyleOrder },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
