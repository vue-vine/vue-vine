// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { LynxElement } from '../types'
import { registerEventHandler, unregisterEventHandler } from '../event-registry'
import { scheduleLynxFlush } from '../scheduler'
import { isWorklet } from '../worklet-runtime'

// Match Vue event handlers: onTap, onClick, etc.
const EVENT_RE = /^on[A-Z]/

// Match main-thread: prefixed event bindings (worklet events)
// e.g., main-thread:global-bindscroll, main-thread:bindtap
const MAIN_THREAD_EVENT_RE = /^main-thread:(global-bind|bind|catch|capture-bind|capture-catch)(\w+)/i

// Match Lynx native event bindings: bindtap, catchtap, global-bindscroll, etc.
const LYNX_EVENT_RE = /^(global-bind|bindEvent|bind|catch|capture-bind|capture-catch)(\w+)/i

// Convert camelCase to kebab-case: backgroundColor -> background-color
const HYPHENATE_RE = /\B([A-Z])/g
function hyphenate(str: string): string {
  return str.replace(HYPHENATE_RE, '-$1').toLowerCase()
}

// Store previous handler signs for cleanup
// Key: element unique id + event name, Value: handler sign
const elementEventSigns = new Map<string, string>()

/**
 * Get element unique ID for event tracking.
 * Uses __GetElementUniqueID PAPI if available.
 */
function getElementEventKey(el: LynxElement, eventName: string): string {
  const uid = __GetElementUniqueID(el)
  return `${uid}:${eventName}`
}

/**
 * Patch element properties for Lynx platform.
 * Directly operates on LynxElement (FiberElement).
 */
export function patchProp(
  el: LynxElement,
  key: string,
  prevValue: unknown,
  nextValue: unknown,
): void {
  if (key === 'class' || key === 'className') {
    patchClass(el, nextValue as string | null)
  }
  else if (key === 'style') {
    patchStyle(el, nextValue as Record<string, unknown> | string | null)
  }
  else if (key === 'id') {
    __SetID(el, nextValue as string | null)
  }
  else if (EVENT_RE.test(key)) {
    // Vue style: onTap, onClick -> tap, click
    patchEvent(el, key, prevValue, nextValue, 'bindEvent')
  }
  else if (MAIN_THREAD_EVENT_RE.test(key)) {
    // Main-thread worklet event: main-thread:bindtap, main-thread:global-bindscroll
    patchMainThreadEvent(el, key, prevValue, nextValue)
  }
  else if (LYNX_EVENT_RE.test(key)) {
    // Lynx native style: bindtap, catchtap, etc.
    patchLynxEvent(el, key, prevValue, nextValue)
  }
  else {
    // Generic attribute
    __SetAttribute(el, key, nextValue)
  }

  // Schedule flush to commit changes to Lynx Native
  scheduleLynxFlush()
}

function patchClass(el: LynxElement, value: string | null): void {
  __SetClasses(el, value ?? '')
}

function patchStyle(
  el: LynxElement,
  next: Record<string, unknown> | string | null,
): void {
  if (typeof next === 'object' && next !== null) {
    // Handle object style: { padding: '20px', backgroundColor: '#fff' }
    for (const [key, value] of Object.entries(next)) {
      // Convert camelCase to kebab-case for Lynx
      const styleName = key.includes('-') ? key : hyphenate(key)
      __AddInlineStyle(el, styleName, value)
    }
  }
  else if (typeof next === 'string') {
    // Handle inline style string: "padding: 20px; background-color: #fff"
    const styles = next.split(';').filter(Boolean)
    for (const style of styles) {
      const colonIdx = style.indexOf(':')
      if (colonIdx > 0) {
        const key = style.slice(0, colonIdx).trim()
        const value = style.slice(colonIdx + 1).trim()
        if (key && value) {
          __AddInlineStyle(el, key, value)
        }
      }
    }
  }
}

type EventHandler = (...args: unknown[]) => void

/**
 * Patch Vue-style event handlers (onTap, onClick, etc.)
 */
function patchEvent(
  el: LynxElement,
  key: string,
  prevValue: unknown,
  nextValue: unknown,
  eventType: string,
): void {
  // Convert onTap -> tap, onClick -> click
  const eventName = key.slice(2).toLowerCase()
  const eventKey = getElementEventKey(el, `${eventType}:${eventName}`)

  // Cleanup previous handler if exists
  const prevSign = elementEventSigns.get(eventKey)
  if (prevSign && prevValue) {
    unregisterEventHandler(prevSign)
    elementEventSigns.delete(eventKey)
  }

  if (nextValue && typeof nextValue === 'function') {
    // Register new handler and get its sign
    const sign = registerEventHandler(nextValue as EventHandler)
    elementEventSigns.set(eventKey, sign)

    // Call Lynx PAPI with the sign string
    __AddEvent(el, eventType, eventName, sign)
  }
  else if (!nextValue && prevSign) {
    // Remove event binding
    __AddEvent(el, eventType, eventName, undefined)
  }
}

/**
 * Patch main-thread worklet event bindings.
 * These events are handled directly on main thread via worklet runtime.
 *
 * Format: main-thread:global-bindscroll, main-thread:bindtap
 */
function patchMainThreadEvent(
  el: LynxElement,
  key: string,
  _prevValue: unknown,
  nextValue: unknown,
): void {
  const match = MAIN_THREAD_EVENT_RE.exec(key)
  if (!match)
    return

  // Extract event type and name from "main-thread:global-bindscroll"
  let eventType = match[1]!.toLowerCase()
  const eventName = match[2]!.toLowerCase()

  // Normalize event type to Lynx format
  if (eventType === 'bind') {
    eventType = 'bindEvent'
  }
  else if (eventType === 'catch') {
    eventType = 'catchEvent'
  }
  else if (eventType === 'global-bind') {
    eventType = 'global-bindEvent'
  }

  if (nextValue && isWorklet(nextValue)) {
    // Set _workletType for Lynx engine to recognize this as a main-thread worklet
    const workletValue = nextValue as { _wkltId: string, _workletType?: string }
    workletValue._workletType = 'main-thread'

    // Pass worklet object to Lynx for main-thread execution
    // Lynx will call runWorklet(workletObj, [event]) when event fires
    __AddEvent(el, eventType, eventName, { type: 'worklet', value: workletValue })
  }
  else if (nextValue && typeof nextValue === 'function') {
    // Fallback: if handler is a regular function (shouldn't happen normally)
    // Register it in event registry and pass sign
    const sign = registerEventHandler(nextValue as EventHandler)
    __AddEvent(el, eventType, eventName, sign)
  }
  else {
    // Remove event binding
    __AddEvent(el, eventType, eventName, undefined)
  }
}

/**
 * Patch Lynx native event bindings (bindtap, catchtap, capture-bind, etc.)
 */
function patchLynxEvent(
  el: LynxElement,
  key: string,
  prevValue: unknown,
  nextValue: unknown,
): void {
  const match = LYNX_EVENT_RE.exec(key)
  if (!match)
    return

  // Extract event type and name: "bindtap" -> ["bind", "tap"], "catchtouchstart" -> ["catch", "touchstart"]
  let eventType = match[1]!.toLowerCase()
  const eventName = match[2]!.toLowerCase()

  // Normalize event type to Lynx format
  if (eventType === 'bind') {
    eventType = 'bindEvent'
  }
  else if (eventType === 'catch') {
    eventType = 'catchEvent'
  }
  else if (eventType === 'global-bind') {
    eventType = 'global-bindEvent'
  }

  const eventKey = getElementEventKey(el, `${eventType}:${eventName}`)

  // Cleanup previous handler if exists
  const prevSign = elementEventSigns.get(eventKey)
  if (prevSign && prevValue) {
    unregisterEventHandler(prevSign)
    elementEventSigns.delete(eventKey)
  }

  if (nextValue && typeof nextValue === 'function') {
    // Register new handler and get its sign
    const sign = registerEventHandler(nextValue as EventHandler)
    elementEventSigns.set(eventKey, sign)

    // Call Lynx PAPI with the sign string
    __AddEvent(el, eventType, eventName, sign)
  }
  else if (!nextValue && prevSign) {
    // Remove event binding
    __AddEvent(el, eventType, eventName, undefined)
  }
}
