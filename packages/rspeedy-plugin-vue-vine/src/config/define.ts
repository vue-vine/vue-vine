// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

export interface DefineValues {
  // Vue feature flags
  __VUE_OPTIONS_API__: string
  __VUE_PROD_DEVTOOLS__: string
  __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: string
  // Lynx build-time macros
  __DEV__: string
  __JS__: string
  __LEPUS__: string
  __MAIN_THREAD__: string
  __BACKGROUND__: string
  __PROFILE__: string
  __ALOG__: string
}

/**
 * Get define values for main thread bundle
 */
export function getMainThreadDefines(isDev: boolean): DefineValues {
  return {
    // Vue feature flags
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    // Lynx build-time macros - main thread specific
    __DEV__: String(isDev),
    __JS__: 'false', // Main thread runs in Lepus (native script engine)
    __LEPUS__: 'true',
    __MAIN_THREAD__: 'true',
    __BACKGROUND__: 'false',
    __PROFILE__: 'false',
    __ALOG__: 'false',
  }
}

/**
 * Get define values for background thread bundle
 */
export function getBackgroundDefines(isDev: boolean): DefineValues {
  return {
    // Vue feature flags
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    // Lynx build-time macros - background thread specific
    __DEV__: String(isDev),
    __JS__: 'true', // Background thread runs in JS context
    __LEPUS__: 'false',
    __MAIN_THREAD__: 'false',
    __BACKGROUND__: 'true',
    __PROFILE__: 'false',
    __ALOG__: 'false',
  }
}

/**
 * Get combined define values (when not using per-layer defines)
 * Currently Vue runs in main thread, so we use main thread values
 */
export function getCombinedDefines(isDev: boolean): DefineValues {
  return getMainThreadDefines(isDev)
}

export interface SharedDefineValues {
  // Vue feature flags
  __VUE_OPTIONS_API__: string
  __VUE_PROD_DEVTOOLS__: string
  __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: string
  // Common Lynx macros
  __DEV__: string
  __PROFILE__: string
  __ALOG__: string
}

/**
 * Get shared define values (excluding layer-specific macros)
 * __MAIN_THREAD__, __BACKGROUND__, __JS__, __LEPUS__ are handled per-layer
 *
 * Note: DefinePlugin values must be JSON stringified for proper replacement
 */
export function getSharedDefines(isDev: boolean): SharedDefineValues {
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
  __JS__: string
  __LEPUS__: string
  __MAIN_THREAD__: string
  __BACKGROUND__: string
}

/**
 * Get layer-specific define values for main thread
 */
export function getMainThreadLayerDefines(): LayerDefineValues {
  return {
    __JS__: 'false',
    __LEPUS__: 'true',
    __MAIN_THREAD__: 'true',
    __BACKGROUND__: 'false',
  }
}

/**
 * Get layer-specific define values for background thread
 */
export function getBackgroundLayerDefines(): LayerDefineValues {
  return {
    __JS__: 'true',
    __LEPUS__: 'false',
    __MAIN_THREAD__: 'false',
    __BACKGROUND__: 'true',
  }
}
