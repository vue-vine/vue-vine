import { createRouter, createWebHistory } from 'vue-router'
import { Home } from './pages/home.vine'
import { Registry } from './pages/registry.vine'

const routes = [
  { path: '/', component: Home },
  { path: '/register', component: Registry },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
