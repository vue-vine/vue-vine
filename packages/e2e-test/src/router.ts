import { createRouter, createWebHistory } from 'vue-router'
import { TestTsMorphComplexExternal } from './components/ts-morph-complex-external/test-ts-morph.vine'
import { TestCustomElement } from './fixtures/custom-elements.vine'
import { TestExternalStyleImport } from './fixtures/external-style-import.vine'
import { HmrApp } from './fixtures/hmr.vine'
import { TestVineWithJsx } from './fixtures/mix-with-jsx.vine'
import { TestDestructurePropsPage } from './fixtures/props-destructure.vine'
import { TestStyleOrder } from './fixtures/style-order.vine'
import { TodoList } from './fixtures/todo-list.vine'
import { TestTransformAssetUrl } from './fixtures/transform-asset-url.vine'
import { TestUseDefaults } from './fixtures/use-defaults.vine'
import { VaporTestContainer } from './fixtures/vapor-interop.vine'
import { TestVibe } from './fixtures/vibe.vine'
import { TestVineModel } from './fixtures/vine-model.vine'
import { TestVinePropPage } from './fixtures/vine-prop.vine'
import { TestVineSlots } from './fixtures/vine-slots.vine'
import { TestVineValidatorsPage } from './fixtures/vine-validators.vine'
import Welcome from './welcome.vine'

const routes = [
  { path: '/', component: Welcome },
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
  { path: '/mix-with-jsx', component: TestVineWithJsx },
  { path: '/ts-morph-complex-external', component: TestTsMorphComplexExternal },
  { path: '/vine-prop', component: TestVinePropPage },
  { path: '/vine-slots', component: TestVineSlots },
  { path: '/custom-elements', component: TestCustomElement },
  { path: '/vapor-interop', component: VaporTestContainer },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
