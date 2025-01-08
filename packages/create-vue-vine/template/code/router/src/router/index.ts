import { Home } from '@/pages/home.vine'

import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: () => import('@/pages/about.vine') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
