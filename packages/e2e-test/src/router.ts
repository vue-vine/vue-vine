import { createRouter, createWebHistory } from 'vue-router'
import { TestExternalStyleImport } from './fixtures/external-style-import.vine'
import { HmrApp } from './fixtures/hmr.vine'
import { TestDestructurePropsPage } from './fixtures/props-destructure.vine'
import { TestStyleOrder } from './fixtures/style-order.vine'
import { TodoList } from './fixtures/todo-list.vine'
import { TestTransformAssetUrl } from './fixtures/transform-asset-url.vine'
import { TestUseDefaults } from './fixtures/use-defaults.vine'
import { TestVibe } from './fixtures/vibe.vine'
import { TestVineModel } from './fixtures/vine-model.vine'
import { TestVineValidatorsPage } from './fixtures/vine-validators.vine'

const routes = [
  { path: '/hmr', component: HmrApp },
  { path: '/style-order', component: TestStyleOrder },
  { path: '/external-style-import', component: TestExternalStyleImport },
  { path: '/transform-asset-url', component: TestTransformAssetUrl },
  { path: '/props-destructure', component: TestDestructurePropsPage },
  { path: '/vibe', component: TestVibe },
  { path: '/use-defaults', component: TestUseDefaults },
  { path: '/vine-model', component: TestVineModel },
  { path: '/vine-validators', component: TestVineValidatorsPage },
  { path: '/todo-list', component: TodoList },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
