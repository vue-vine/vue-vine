// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

const EVENT_RE = /^on[A-Z]/

/**
 * Patch element properties for Lynx platform.
 * Directly operates on LynxElement (FiberElement).
 */
export function patchProp(
  el: LynxElement,
  key: string,
  _prevValue: unknown,
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
    patchEvent(el, key, nextValue)
  }
  else {
    // Generic attribute
    __SetAttribute(el, key, nextValue)
  }
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
      __AddInlineStyle(el, key, value)
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

function patchEvent(
  el: LynxElement,
  key: string,
  nextValue: unknown,
): void {
  // Convert onTap -> tap, onClick -> click
  const eventName = key.slice(2).toLowerCase()

  if (nextValue) {
    __AddEvent(el, 'bindEvent', eventName, nextValue)
  }
}
