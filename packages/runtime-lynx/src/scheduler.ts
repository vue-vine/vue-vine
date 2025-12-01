// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import { queuePostFlushCb } from '@vue/runtime-core'

/**
 * Flag to track if a flush is already scheduled.
 * This prevents multiple __FlushElementTree calls in the same flush cycle.
 */
let flushScheduled = false

/**
 * Schedule a flush to commit element tree changes to Lynx Native.
 * Uses Vue's queuePostFlushCb to ensure __FlushElementTree is called
 * after all reactive updates are processed.
 *
 * This function is debounced - multiple calls in the same tick
 * will only result in one __FlushElementTree call.
 */
export function scheduleLynxFlush(): void {
  if (flushScheduled) {
    return
  }

  flushScheduled = true
  queuePostFlushCb(flushElementTree)
}

/**
 * Internal callback that calls __FlushElementTree and resets the flag.
 */
function flushElementTree(): void {
  flushScheduled = false
  __FlushElementTree()
}
