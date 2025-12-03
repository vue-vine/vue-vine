// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Layer names for Lynx dual-thread code splitting.
 * - MAIN_THREAD: UI rendering, PAPI calls, event handler storage
 * - BACKGROUND: Event forwarding, receives events from Lynx Native
 */
export const LAYERS = {
  MAIN_THREAD: 'vue-vine:main-thread',
  BACKGROUND: 'vue-vine:background',
} as const

export const PLUGIN_NAME = 'vue-vine-lynx'
export const PLUGIN_NAME_TEMPLATE = 'lynx:template'
export const DEFAULT_DIST_PATH_INTERMEDIATE = '.rspeedy'

/**
 * Default LynxTemplatePlugin options
 */
export const DEFAULT_LYNX_TEMPLATE_OPTIONS = {
  dsl: 'custom',
  debugInfoOutside: true,
  defaultDisplayLinear: true,
  enableA11y: true,
  enableCSSSelector: true,
  enableParallelElement: true,
  enableRemoveCSSScope: true,
  pipelineSchedulerConfig: 0x00010000,
  removeDescendantSelectorScope: true,
  targetSdkVersion: '3.2',
} as const

