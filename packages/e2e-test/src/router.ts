import { createRouter, createWebHistory } from 'vue-router'
import { TestExternalStyleImport } from './external-style-import.vine'
import { TestStyleOrder } from './style-order.vine'
import { App } from './test.vine'

const routes = [
  { path: '/', component: App },
  { path: '/style-order', component: TestStyleOrder },
  { path: '/external-style-import', component: TestExternalStyleImport },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
