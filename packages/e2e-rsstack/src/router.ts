import { createRouter, createWebHistory } from 'vue-router'
import { TestExternalStyleImport } from './fixtures/external-style-import.vine'
import { TestRspackHmrPage } from './fixtures/hmr.vine'
import { TestStyleOrder } from './fixtures/style-order.vine'
import { TestTransformAssetUrl } from './fixtures/transform-asset-url.vine'
import { TestTsMorphComplexExternal } from './fixtures/ts-morph-complex-external/test-ts-morph.vine'
import { TestVinePropPage } from './fixtures/vine-prop.vine'
import { WelcomePage } from './welcome.vine'

const routes = [
  { path: '/', component: WelcomePage },
  { path: '/hmr', component: TestRspackHmrPage },
  { path: '/vine-prop', component: TestVinePropPage },
  { path: '/ts-morph-complex-external', component: TestTsMorphComplexExternal },
  { path: '/style-order', component: TestStyleOrder },
  { path: '/external-style-import', component: TestExternalStyleImport },
  { path: '/transform-asset-url', component: TestTransformAssetUrl },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
