// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type {
  CompilerError,
  DirectiveNode,
  NodeTransform,
  SimpleExpressionNode,
  SourceLocation,
} from '@vue/compiler-dom'
import type {
  VineCompFnCtx,
  VineFileCtx,
} from '../types'
import {
  createSimpleExpression,
  NodeTypes,
} from '@vue/compiler-dom'

/**
 * Lynx Event Transform Plugin
 *
 * Transforms Vue event syntax (@tap, v-on:tap) to Lynx native event format.
 *
 * Vue Syntax -> Lynx Syntax:
 *   @tap              -> bindtap
 *   @tap.catch        -> catchtap
 *   @tap.capture      -> capture-bindtap
 *   @tap.catch.capture -> capture-catchtap
 *   @tap.global       -> global-bindtap
 *   @tap.main-thread  -> main-thread:bindtap
 *
 * Modifiers can be combined:
 *   @tap.catch.capture.main-thread -> main-thread:capture-catchtap
 *
 * The transform converts v-on directives to v-bind directives with
 * the computed Lynx event attribute name.
 */

export interface LynxEventTransformOptions {
  onError?: (error: CompilerError) => void
  vineFileCtx?: VineFileCtx
  vineCompFnCtx?: VineCompFnCtx
}

// Detect inline function expression (arrow function or function expression)
const INLINE_FN_RE = /^\s*(?:\(.*?\)\s*=>|function\s*\()/

/**
 * Check if a function name is marked as 'main thread' in the collected directive functions
 */
function isMainThreadFunction(fnName: string, vineFileCtx?: VineFileCtx): boolean {
  if (!vineFileCtx?.lynx?.directiveFns) {
    return false
  }
  return vineFileCtx.lynx.directiveFns.some(
    fn => fn.fnName === fnName && fn.directive === 'main thread',
  )
}

/**
 * Create a compiler error object
 */
function createError(
  name: string,
  message: string,
  loc?: SourceLocation,
): CompilerError {
  return {
    name,
    code: 0,
    message,
    loc,
  }
}

/**
 * Convert Vue event modifiers to Lynx event attribute name
 *
 * @param eventName Base event name (e.g., "tap", "touchstart")
 * @param modifiers Array of modifiers
 * @returns Lynx event attribute name (e.g., "main-thread:capture-catchtap")
 */
function buildLynxEventAttr(eventName: string, modifiers: string[]): {
  attrName: string
  isMainThread: boolean
} {
  const hasCapture = modifiers.includes('capture')
  const hasCatch = modifiers.includes('catch')
  const hasGlobal = modifiers.includes('global')
  const hasMainThread = modifiers.includes('main-thread')

  // Build the event type prefix
  let eventType: string
  if (hasGlobal) {
    eventType = 'global-bind'
  }
  else if (hasCapture && hasCatch) {
    eventType = 'capture-catch'
  }
  else if (hasCapture) {
    eventType = 'capture-bind'
  }
  else if (hasCatch) {
    eventType = 'catch'
  }
  else {
    eventType = 'bind'
  }

  // Build the full attribute name
  const baseAttr = `${eventType}${eventName}`
  const attrName = hasMainThread ? `main-thread:${baseAttr}` : baseAttr

  return { attrName, isMainThread: hasMainThread }
}

/**
 * Create Lynx event transform plugin
 *
 * Transforms Vue event syntax (@tap) to Lynx native format (bindtap).
 */
export function transformLynxEvent(options: LynxEventTransformOptions = {}): NodeTransform {
  const { onError, vineFileCtx, vineCompFnCtx } = options

  return (node) => {
    if (node.type !== NodeTypes.ELEMENT) {
      return
    }

    const props = node.props
    for (let i = 0; i < props.length; i++) {
      const prop = props[i]

      // Only process v-on directives
      if (prop.type !== NodeTypes.DIRECTIVE || prop.name !== 'on') {
        continue
      }

      const directive = prop as DirectiveNode

      // Get event name from arg
      if (!directive.arg || directive.arg.type !== NodeTypes.SIMPLE_EXPRESSION) {
        continue
      }

      const eventArg = directive.arg as SimpleExpressionNode

      // Skip dynamic event names (we can't transform them)
      if (!eventArg.isStatic) {
        onError?.(createError(
          'vue-vine-lynx/dynamic-event-not-supported',
          `[Vue Vine Lynx] Dynamic event names are not supported. Use static event name like @tap instead.`,
          prop.loc,
        ))
        continue
      }

      const eventName = eventArg.content.toLowerCase()

      // Get modifiers from directive
      // Note: Vue's modifiers are SimpleExpressionNode[], we need to extract their content
      const rawModifiers = directive.modifiers ?? []
      const modifiers = rawModifiers.map(m =>
        typeof m === 'string' ? m : (m as SimpleExpressionNode).content,
      )

      // Filter out Vue's built-in modifiers that we handle specially
      // .stop, .prevent, .self, .once, .passive are Vue-specific and not applicable
      const vueOnlyModifiers = ['stop', 'prevent', 'self', 'once', 'passive', 'native']
      const lynxModifiers = modifiers.filter(m => !vueOnlyModifiers.includes(m))
      const hasVueOnlyModifiers = modifiers.some(m => vueOnlyModifiers.includes(m))

      if (hasVueOnlyModifiers) {
        const usedVueModifiers = modifiers.filter(m => vueOnlyModifiers.includes(m))
        onError?.(createError(
          'vue-vine-lynx/unsupported-modifier',
          `[Vue Vine Lynx] Modifiers "${usedVueModifiers.join(', ')}" are not supported on Lynx. `,
          prop.loc,
        ))
      }

      // Build Lynx event attribute name
      const { attrName, isMainThread } = buildLynxEventAttr(eventName, lynxModifiers)

      // Get handler expression
      const expContent = directive.exp?.type === NodeTypes.SIMPLE_EXPRESSION
        ? (directive.exp as SimpleExpressionNode).content
        : ''

      if (!expContent) {
        continue
      }

      const isInlineFn = INLINE_FN_RE.test(expContent)

      // Validate main-thread events
      if (isMainThread) {
        // Collect main-thread event binding info
        if (vineFileCtx?.lynx && vineCompFnCtx) {
          vineFileCtx.lynx.mainThreadEventBindings.push({
            compFnName: vineCompFnCtx.fnName,
            eventAttr: attrName,
            handlerExpr: expContent,
            isInlineFn,
            loc: prop.loc,
          })
        }

        // Validate: handler must be a 'main thread' function
        if (!isInlineFn) {
          const fnName = expContent.trim()
          if (!isMainThreadFunction(fnName, vineFileCtx)) {
            onError?.(createError(
              'vue-vine-lynx/main-thread-handler-required',
              `[Vue Vine Lynx] Handler "${fnName}" for "@${eventName}.main-thread" must be a 'main thread' function. `
              + `Add 'main thread' directive to the function body.`,
              prop.loc,
            ))
          }
        }
        else {
          // For inline function, check for 'main thread' directive
          if (!expContent.includes(`'main thread'`) && !expContent.includes(`"main thread"`)) {
            onError?.(createError(
              'vue-vine-lynx/main-thread-inline-directive-required',
              `[Vue Vine Lynx] Inline function for "@${eventName}.main-thread" must include 'main thread' directive.`,
              prop.loc,
            ))
          }
        }
      }

      // Replace v-on directive with v-bind directive
      // @tap="handler" -> :bindtap="handler"
      props[i] = {
        type: NodeTypes.DIRECTIVE,
        name: 'bind',
        arg: createSimpleExpression(attrName, true, eventArg.loc),
        exp: directive.exp,
        modifiers: [],
        loc: prop.loc,
      }
    }
  }
}

/**
 * Get Lynx event transform plugin array
 *
 * @param enabled Whether Lynx mode is enabled
 * @param onError Error callback
 * @param vineFileCtx Vine file context for validation
 * @param vineCompFnCtx Vine component function context
 */
export function getLynxEventTransformPlugin(
  enabled: boolean,
  onError?: (error: CompilerError) => void,
  vineFileCtx?: VineFileCtx,
  vineCompFnCtx?: VineCompFnCtx,
): NodeTransform[] {
  if (!enabled) {
    return []
  }
  return [transformLynxEvent({ onError, vineFileCtx, vineCompFnCtx })]
}
