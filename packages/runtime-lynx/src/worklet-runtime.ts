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
  console.log('[VueVine:Worklet] initEventListeners called')
  const jsContext = lynx.getJSContext()
  console.log('[VueVine:Worklet] jsContext:', jsContext)

  // Listen for worklet execution requests from native
  jsContext.addEventListener('Lynx.Worklet.runWorkletCtx', (event: { data: string }) => {
    console.log('[VueVine:Worklet] runWorkletCtx event received:', event)
    const data: WorkletEventData = JSON.parse(event.data)
    console.log('[VueVine:Worklet] parsed event data:', data)
    const result = runWorklet(data.worklet, data.params)
    console.log('[VueVine:Worklet] worklet result:', result)

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
  console.log('[VueVine:Worklet] event listener registered')
}

// ============================================
// Worklet Runtime Core
// ============================================

/**
 * Initialize the worklet runtime.
 * Must be called before any worklet registration or execution.
 */
export function initWorkletRuntime(): void {
  console.log('[VueVine:Worklet] initWorkletRuntime called')

  if (globalThis.lynxWorkletImpl) {
    console.log('[VueVine:Worklet] runtime already initialized, skipping')
    return
  }

  globalThis.lynxWorkletImpl = {
    _workletMap: {},
  }
  console.log('[VueVine:Worklet] lynxWorkletImpl created')

  globalThis.registerWorklet = registerWorklet
  globalThis.runWorklet = runWorklet
  console.log('[VueVine:Worklet] global functions registered')

  // Initialize event listeners for native worklet calls
  initEventListeners()
  console.log('[VueVine:Worklet] initWorkletRuntime completed')
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
  console.log('[VueVine:Worklet] registerWorklet called:', { type: _type, id, fn: fn.toString().slice(0, 100) })

  if (!globalThis.lynxWorkletImpl) {
    console.warn('[VueVine:Worklet] Worklet runtime not initialized')
    return
  }
  globalThis.lynxWorkletImpl._workletMap[id] = fn
  console.log('[VueVine:Worklet] worklet registered, current map keys:', Object.keys(globalThis.lynxWorkletImpl._workletMap))
}

/**
 * Execute a worklet function.
 *
 * @param worklet - The worklet object containing _wkltId and optional _c context
 * @param params - Parameters to pass to the worklet function
 * @returns The result of the worklet function
 */
export function runWorklet(worklet: Worklet, params: unknown[]): unknown {
  console.log('[VueVine:Worklet] runWorklet called:', { worklet, params })

  if (!globalThis.lynxWorkletImpl) {
    console.warn('[VueVine:Worklet] Worklet runtime not initialized')
    return
  }

  if (!worklet || typeof worklet !== 'object' || !worklet._wkltId) {
    console.warn('[VueVine:Worklet] Invalid worklet object:', worklet)
    return
  }

  console.log('[VueVine:Worklet] looking up worklet:', worklet._wkltId)
  console.log('[VueVine:Worklet] available worklets:', Object.keys(globalThis.lynxWorkletImpl._workletMap))

  const fn = globalThis.lynxWorkletImpl._workletMap[worklet._wkltId]
  if (!fn) {
    console.warn('[VueVine:Worklet] Worklet not found:', worklet._wkltId)
    return
  }

  console.log('[VueVine:Worklet] worklet found, transforming params...')
  // Transform parameters to wrap elementRefptr with MainThreadElement
  // This enables methods like setStyleProperty on event.currentTarget
  for (const param of params) {
    transformWorkletParams(param)
  }
  console.log('[VueVine:Worklet] params transformed:', params)

  // Bind closure context if present
  const boundFn = worklet._c ? fn.bind(worklet) : fn

  console.log('[VueVine:Worklet] executing worklet function...')
  const result = boundFn(...params)
  console.log('[VueVine:Worklet] worklet execution result:', result)
  return result
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
