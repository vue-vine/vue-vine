// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { RendererOptions } from 'vue'
import type { LynxElement } from '../types'
import { scheduleLynxFlush } from '../scheduler'
import { patchProp } from './patch-prop'

/**
 * Vue renderer node operations for Lynx platform.
 * Directly operates on LynxElement (FiberElement) returned by Lynx Native PAPI.
 */
export const lynxVueVineRenderOptions: RendererOptions = {
  /**
   * Patch element properties for Lynx platform.
   */
  patchProp,

  /**
   * Create a Lynx element by tag name
   */
  createElement(type: string): LynxElement {
    switch (type) {
      case 'view':
        return __CreateView(0)
      case 'text':
        return __CreateText(0)
      default:
        return __CreateElement(type, 0)
    }
  },

  /**
   * Create a raw text node
   */
  createText(text: string): LynxElement {
    return __CreateRawText(text)
  },

  /**
   * Create a comment node (use empty raw text as placeholder in Lynx)
   */
  createComment(_text: string): LynxElement {
    return __CreateRawText('')
  },

  /**
   * Set the text content of a raw text node
   */
  setText(node: LynxElement, text: string): void {
    __SetAttribute(node, 'text', text)
    scheduleLynxFlush()
  },

  /**
   * Set text content of an element (for <text> element)
   */
  setElementText(el: LynxElement, text: string): void {
    // Clear existing children using Lynx PAPI
    let child = __FirstElement(el)
    while (child) {
      const next = __NextElement(child)
      __RemoveElement(el, child)
      child = next
    }
    // Append raw text node
    const textNode = __CreateRawText(text)
    __AppendElement(el, textNode)
    scheduleLynxFlush()
  },

  /**
   * Insert a child node into parent, optionally before an anchor node
   */
  insert(child: LynxElement, parent: LynxElement, anchor?: LynxElement | null): void {
    if (anchor) {
      __InsertElementBefore(parent, child, anchor)
    }
    else {
      __AppendElement(parent, child)
    }
    scheduleLynxFlush()
  },

  /**
   * Remove a child node from its parent
   */
  remove(child: LynxElement): void {
    const parent = __GetParent(child)
    if (parent) {
      __RemoveElement(parent, child)
      scheduleLynxFlush()
    }
  },

  /**
   * Get the parent node of an element
   */
  parentNode(node: LynxElement): LynxElement | null {
    return __GetParent(node)
  },

  /**
   * Get the next sibling of an element
   */
  nextSibling(node: LynxElement): LynxElement | null {
    return __NextElement(node) ?? null
  },
}
