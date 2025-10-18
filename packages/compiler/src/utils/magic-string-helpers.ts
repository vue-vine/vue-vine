import type MagicString from 'magic-string'

interface Node {
  start?: number | null
  end?: number | null
}

interface ReplaceRangeState {
  nodes: Node[]
  indexes: Record<number, number>
}

// Store state for each MagicString instance
const replaceRangeStateMap = new WeakMap<
  MagicString,
  Record<number, ReplaceRangeState>
>()

/**
 * Replace a range of text with new content, preserving accurate sourcemap.
 *
 * This implementation is based on magic-string-ast's replaceRange method.
 * Reference: https://github.com/sxzz/magic-string-ast
 *
 * @param ms - MagicString instance
 * @param start - The start index of the range to replace
 * @param end - The end index of the range to replace
 * @param nodes - The strings or nodes to insert into the range
 */
export function replaceRange(
  ms: MagicString,
  start: number,
  end: number,
  ...nodes: (string | Node)[]
): void {
  // Get or initialize state for this MagicString instance
  let stateRecord = replaceRangeStateMap.get(ms)
  if (!stateRecord) {
    stateRecord = {}
    replaceRangeStateMap.set(ms, stateRecord)
  }

  // Use offset 0 as default (MagicString doesn't expose offset property)
  const offset = 0
  const state = stateRecord[offset] || (stateRecord[offset] = { nodes: [], indexes: {} })

  if (nodes.length) {
    let index = state.indexes[start] || 0
    let intro = ''
    let prevNode: Node | undefined

    for (const node of nodes) {
      if (typeof node === 'string') {
        node && (intro += node)
      }
      else {
        // Move the node to the target position
        ms.move(node.start!, node.end!, start)
        index = node.start!
        prevNode = node
        if (intro) {
          ms.appendRight(index, intro)
          intro = ''
        }
        state.nodes.push(node)
      }
    }

    if (intro) {
      ms.appendLeft(prevNode?.end ?? start, intro)
    }
    state.indexes[start] = index
  }

  if (end > start) {
    let index = start
    state.nodes
      .filter(node => node.start! >= start && node.end! <= end)
      .sort((a, b) => a.start! - b.start!)
      .forEach((node) => {
        if (node.start! > index) {
          ms.remove(index, node.start!)
        }
        index = node.end!
      })
    ms.remove(index, end)
  }
}
