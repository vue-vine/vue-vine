import { createRouter, createWebHistory } from 'vue-router'
import { TestExternalStyleImport } from './external-style-import.vine'
import { HmrApp } from './hmr.vine'
import { TestDestructurePropsPage } from './props-destructure.vine'
import { TestStyleOrder } from './style-order.vine'
import { TestTransformAssetUrl } from './transform-asset-url.vine'
import { TestVibe } from './vibe.vine'

const routes = [
  { path: '/hmr', component: HmrApp },
  { path: '/style-order', component: TestStyleOrder },
  { path: '/external-style-import', component: TestExternalStyleImport },
  { path: '/transform-asset-url', component: TestTransformAssetUrl },
  { path: '/props-destructure', component: TestDestructurePropsPage },
  { path: '/vibe', component: TestVibe },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
