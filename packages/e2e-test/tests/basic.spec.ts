import { describe, expect, it } from 'vitest'
import { createBrowserCtxEnvironment, getAssetUrl, getColor } from '../utils/test-utils'

describe('test basic functionality', () => {
  it.concurrent('should be aligned with SFC style order', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await getColor(browserCtx, '.test-style-order h2.test')).toBe('rgb(255, 0, 0)')
    expect(await getColor(browserCtx, '.child-comp span.test')).toBe('rgb(255, 0, 0)')
  }, {
    targetRoute: '/style-order',
  }))

  it.concurrent('should apply external imported style', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await getColor(browserCtx, '.container .test-me')).toBe('rgb(0, 0, 0)')
    expect(await getColor(browserCtx, '.child-comp .test-me')).toBe('rgb(255, 0, 0)')
  }, {
    targetRoute: '/external-style-import',
  }))

  it.concurrent('should transform asset url', createBrowserCtxEnvironment(async (browserCtx) => {
    expect(await getAssetUrl(browserCtx, '.test-transform-asset-url img')).toBe('/src/assets/sample.jpg')
  }, {
    targetRoute: '/transform-asset-url',
  }))
})
