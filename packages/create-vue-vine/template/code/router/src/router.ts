import { createRouter, createWebHistory } from 'vue-router'
import { About } from './pages/about.vine'
import { Home } from './pages/home.vine'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
