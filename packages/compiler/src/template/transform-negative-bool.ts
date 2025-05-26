import type {
  ConstantTypes,
  NodeTransform,
  NodeTypes,
} from '@vue/compiler-dom'

export const transformBooleanProp: NodeTransform = (node) => {
  if (node.type !== (1 satisfies NodeTypes.ELEMENT))
    return
  for (const [i, prop] of node.props.entries()) {
    if (
      prop.type !== (6 satisfies NodeTypes.ATTRIBUTE)
      || prop.value !== undefined
    ) {
      continue
    }

    const isNegative = prop.name[0] === '!'
    const propName = isNegative ? prop.name.slice(1) : prop.name
    const value = String(!isNegative)
    if (isNegative)
      prop.loc.start.offset++
    node.props[i] = {
      type: 7 satisfies NodeTypes.DIRECTIVE,
      name: 'bind',
      arg: {
        type: 4 satisfies NodeTypes.SIMPLE_EXPRESSION,
        constType: 3 satisfies ConstantTypes.CAN_STRINGIFY,
        content: propName,
        isStatic: true,
        loc: prop.loc,
      },
      exp: {
        type: 4 satisfies NodeTypes.SIMPLE_EXPRESSION,
        constType: 3 satisfies ConstantTypes.CAN_STRINGIFY,
        content: value,
        isStatic: false,
        loc: {
          start: {
            ...prop.loc.start,
            offset: prop.loc.start.offset + 1,
          },
          end: prop.loc.end,
          source: value,
        },
      },
      loc: prop.loc,
      modifiers: [],
    }
  }
}
