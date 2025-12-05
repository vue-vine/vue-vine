// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { DefinePluginOptions } from '@rspack/core'

/**
 * Get shared define values (excluding layer-specific macros)
 */
export function getSharedDefines(isDev: boolean): DefinePluginOptions {
  return {
    // Vue feature flags
    __VUE_OPTIONS_API__: JSON.stringify(true),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    // Common Lynx macros
    __DEV__: JSON.stringify(isDev),
    __PROFILE__: JSON.stringify(false),
    __ALOG__: JSON.stringify(false),
  }
}

export interface LayerDefineValues {
  __MAIN_THREAD__: string
  __BACKGROUND__: string
}

/**
 * Get layer-specific define values for main thread
 */
export function getMainThreadLayerDefines(): LayerDefineValues {
  return {
    __MAIN_THREAD__: 'true',
    __BACKGROUND__: 'false',
  }
}

/**
 * Get layer-specific define values for background thread
 */
export function getBackgroundLayerDefines(): LayerDefineValues {
  return {
    __MAIN_THREAD__: 'false',
    __BACKGROUND__: 'true',
  }
}
