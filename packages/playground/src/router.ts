import { createRouter, createWebHistory } from 'vue-router'
import { AboutPage } from './pages/about.vine'
import { HomePage } from './pages/home.vine'
import { StyleOrder } from './pages/style-order.vine'
import TodoList from './pages/todolist.vine'

const routes = [
  { path: '/', component: HomePage },
  { path: '/about', component: AboutPage },
  { path: '/style-order', component: StyleOrder },
  { path: '/todolist', component: TodoList },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
