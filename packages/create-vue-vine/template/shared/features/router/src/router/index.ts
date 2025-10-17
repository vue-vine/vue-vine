import { createRouter, createWebHistory } from 'vue-router'
import { Home } from '@/pages/home.vine'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: () => import('@/pages/about.vine') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
