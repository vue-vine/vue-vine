import { createRouter, createWebHistory } from 'vue-router'
import { About } from './pages/about.vine'
import { Home } from './pages/home.vine'
import { StyleOrder } from './pages/style-order.vine'
import TodoList from './pages/todolist.vine'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/style-order', component: StyleOrder },
  { path: '/todolist', component: TodoList },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
