/* eslint-disable import/no-mutable-exports */

import { LifecycleConstant } from './life-cycle-constants'

let isJSReady: boolean
let jsReadyEventIdSwap: Record<string | number, number>

/**
 * Notify Lynx Native that JS is ready
 */
function jsReady(): void {
  isJSReady = true

  __OnLifecycleEvent([
    LifecycleConstant.firstScreen, /* FIRST_SCREEN */
    { jsReadyEventIdSwap },
  ])

  jsReadyEventIdSwap = {}
}

function clearJSReadyEventIdSwap(): void {
  jsReadyEventIdSwap = {}
}

function resetJSReady(): void {
  isJSReady = false
  jsReadyEventIdSwap = {}
}

export {
  clearJSReadyEventIdSwap,
  isJSReady,
  jsReady,
  jsReadyEventIdSwap,
  resetJSReady,
}
