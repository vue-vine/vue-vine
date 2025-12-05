/* eslint-disable vars-on-top */
// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Vue Vine Lynx Worklet Runtime
 *
 * Provides worklet registration and execution for main-thread scripts.
 * This enables high-performance event handling directly on the main thread
 * without cross-thread communication overhead.
 *
 * Worklet object structure:
 * {
 *   _wkltId: string,  // Unique identifier for the worklet
 *   _c?: object,      // Closure context (captured variables)
 * }
 */

export interface Worklet {
  _wkltId: string
  _c?: Record<string, unknown>
}

export interface WorkletRuntime {
  _workletMap: Record<string, (...args: unknown[]) => unknown>
}

declare global {
  var lynxWorkletImpl: WorkletRuntime | undefined
  var registerWorklet: (type: string, id: string, fn: (...args: unknown[]) => unknown) => void
  var runWorklet: (worklet: Worklet, params: unknown[]) => unknown
}

// ============================================
// Element API for Main Thread
// ============================================

let willFlush = false

/**
 * Element wrapper for main-thread DOM manipulation.
 * Provides methods like setStyleProperty, setAttribute, etc.
 * These are the actual methods available on event.currentTarget in worklets.
 */
export class MainThreadElement {
  private readonly element: LynxElement

  constructor(element: LynxElement) {
    // Hide the element object to prevent issues with cross-thread transfer
    Object.defineProperty(this, 'element', {
      get() {
        return element
      },
    })
  }

  public setAttribute(name: string, value: unknown): void {
    __SetAttribute(this.element, name, value)
    this.flushElementTree()
  }

  public setStyleProperty(name: string, value: string): void {
    __AddInlineStyle(this.element, name, value)
    this.flushElementTree()
  }

  public setStyleProperties(styles: Record<string, string>): void {
    for (const key in styles) {
      __AddInlineStyle(this.element, key, styles[key]!)
    }
    this.flushElementTree()
  }

  private flushElementTree(): void {
    if (willFlush) {
      return
    }
    willFlush = true
    Promise.resolve().then(() => {
      willFlush = false
      __FlushElementTree()
    })
  }
}

// ============================================
// Parameter Transformation
// ============================================

/**
 * Transform worklet parameters to wrap elementRefptr with MainThreadElement.
 * This allows worklet code to call methods like setStyleProperty on event.currentTarget.
 */
function transformWorkletParams(
  value: unknown,
  depth: number = 0,
): void {
  const limit = 1000
  if (++depth >= limit) {
    throw new Error(`Depth of value exceeds limit of ${limit}.`)
  }

  if (typeof value !== 'object' || value === null) {
    return
  }

  const obj = value as Record<string, unknown>

  for (const key in obj) {
    const subObj = obj[key]
    if (typeof subObj !== 'object' || subObj === null) {
      continue
    }

    // Check if this is an event target (has elementRefptr property)
    if ('elementRefptr' in subObj) {
      obj[key] = new MainThreadElement((subObj as { elementRefptr: LynxElement }).elementRefptr)
      continue
    }

    // Skip if already wrapped
    if (subObj instanceof MainThreadElement) {
      continue
    }

    // Recursively transform nested objects
    transformWorkletParams(subObj, depth)
  }
}

// ============================================
// Event Listeners
// ============================================

interface WorkletEventData {
  worklet: Worklet
  params: unknown[]
  resolveId?: number
}

/**
 * Initialize event listeners for worklet execution.
 * Native triggers worklet events by sending 'Lynx.Worklet.runWorkletCtx' events.
 */
function initEventListeners(): void {
  const jsContext = lynx.getJSContext()

  // Listen for worklet execution requests from native
  jsContext.addEventListener('Lynx.Worklet.runWorkletCtx', (event: { data: string }) => {
    const data: WorkletEventData = JSON.parse(event.data)
    const result = runWorklet(data.worklet, data.params)

    // Send return value back to native if resolveId is provided
    if (data.resolveId !== undefined) {
      jsContext.dispatchEvent({
        type: 'Lynx.Worklet.FunctionCallRet',
        data: JSON.stringify({
          resolveId: data.resolveId,
          returnValue: result,
        }),
      })
    }
  })
}

// ============================================
// Worklet Runtime Core
// ============================================

/**
 * Initialize the worklet runtime.
 * Must be called before any worklet registration or execution.
 */
export function initWorkletRuntime(): void {
  if (globalThis.lynxWorkletImpl) {
    return
  }

  globalThis.lynxWorkletImpl = {
    _workletMap: {},
  }

  globalThis.registerWorklet = registerWorklet
  globalThis.runWorklet = runWorklet

  // Initialize event listeners for native worklet calls
  initEventListeners()
}

/**
 * Register a worklet function.
 *
 * @param _type - Worklet type ('main-thread' or 'ui')
 * @param id - Unique worklet identifier
 * @param fn - The worklet function
 */
export function registerWorklet(
  _type: string,
  id: string,
  fn: (...args: unknown[]) => unknown,
): void {
  if (!globalThis.lynxWorkletImpl) {
    console.warn('[Vue Vine Lynx] Worklet runtime not initialized')
    return
  }
  globalThis.lynxWorkletImpl._workletMap[id] = fn
}

/**
 * Execute a worklet function.
 *
 * @param worklet - The worklet object containing _wkltId and optional _c context
 * @param params - Parameters to pass to the worklet function
 * @returns The result of the worklet function
 */
export function runWorklet(worklet: Worklet, params: unknown[]): unknown {
  if (!globalThis.lynxWorkletImpl) {
    console.warn('[Vue Vine Lynx] Worklet runtime not initialized')
    return
  }

  if (!worklet || typeof worklet !== 'object' || !worklet._wkltId) {
    console.warn('[Vue Vine Lynx] Invalid worklet object:', worklet)
    return
  }

  const fn = globalThis.lynxWorkletImpl._workletMap[worklet._wkltId]
  if (!fn) {
    console.warn('[Vue Vine Lynx] Worklet not found:', worklet._wkltId)
    return
  }

  // Transform parameters to wrap elementRefptr with MainThreadElement
  // This enables methods like setStyleProperty on event.currentTarget
  for (const param of params) {
    transformWorkletParams(param)
  }

  // Bind closure context if present
  const boundFn = worklet._c ? fn.bind(worklet) : fn

  return boundFn(...params)
}

/**
 * Check if a value is a valid worklet object.
 */
export function isWorklet(value: unknown): value is Worklet {
  return (
    typeof value === 'object'
    && value !== null
    && '_wkltId' in value
    && typeof (value as Worklet)._wkltId === 'string'
  )
}
