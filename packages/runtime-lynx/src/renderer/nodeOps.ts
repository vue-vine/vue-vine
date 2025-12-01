// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { LynxElement } from '../types'

/**
 * Vue renderer node operations for Lynx platform.
 * Directly operates on LynxElement (FiberElement) returned by Lynx Native PAPI.
 */
export const nodeOps = {
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
  },

  /**
   * Set text content of an element (for <text> element)
   */
  setElementText(el: LynxElement, text: string): void {
    // Clear existing children
    if (el.children) {
      for (const child of [...el.children]) {
        __RemoveElement(el, child)
      }
    }
    // Append raw text node
    const textNode = __CreateRawText(text)
    __AppendElement(el, textNode)
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
  },

  /**
   * Remove a child node from its parent
   */
  remove(child: LynxElement): void {
    const parent = child.parentElement
    if (parent) {
      __RemoveElement(parent, child)
    }
  },

  /**
   * Get the parent node of an element
   */
  parentNode(node: LynxElement): LynxElement | null {
    return node.parentElement ?? null
  },

  /**
   * Get the next sibling of an element
   */
  nextSibling(node: LynxElement): LynxElement | null {
    const parent = node.parentElement
    if (!parent?.children)
      return null
    const idx = parent.children.indexOf(node)
    return parent.children[idx + 1] ?? null
  },
}
