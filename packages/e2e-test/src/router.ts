import { createRouter, createWebHistory } from 'vue-router'
import { TestStyleOrder } from './style-order.vine'
import { App } from './test.vine'

const routes = [
  { path: '/', component: App },
  { path: '/style-order', component: TestStyleOrder },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
