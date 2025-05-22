import { createRouter, createWebHistory } from 'vue-router'
import { AboutPage } from './pages/about.vine'
import { HomePage } from './pages/home.vine'
import { TestVineWithJsx } from './pages/mix-with-jsx.vine'
import { StyleOrder } from './pages/style-order.vine'
import { TestTsMorph } from './pages/test-ts-morph.vine'
import TodoList from './pages/todolist.vine'

const routes = [
  { path: '/', component: HomePage },
  { path: '/about', component: AboutPage },
  { path: '/style-order', component: StyleOrder },
  { path: '/todolist', component: TodoList },
  { path: '/test-ts-morph', component: TestTsMorph },
  { path: '/test-jsx', component: TestVineWithJsx },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
