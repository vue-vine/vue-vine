import { createRouter, createWebHistory } from 'vue-router'
import { Home } from './pages/home.vine'
import { About } from './pages/about.vine'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
