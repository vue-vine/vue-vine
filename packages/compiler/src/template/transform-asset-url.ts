import type { BindingMetadata, ExpressionNode, NodeTransform, SimpleExpressionNode, SourceLocation, TransformContext } from '@vue/compiler-core'
import type { TransformContext as VaporTransformContext } from '@vue/compiler-vapor'
import { ConstantTypes, createSimpleExpression, NodeTypes, BindingTypes as VueBindingTypes } from '@vue/compiler-core'
import { isDataUrl, isExternalUrl, isRelativeUrl, parseUrl } from '../utils/template'

export type ImportItem = TransformContext['imports'][number]

export interface AssetURLTagConfig {
  [name: string]: string[]
}

export const defaultAssetUrlOptions = {
  base: null,
  tags: {
    video: ['src', 'poster'],
    source: ['src'],
    img: ['src'],
    image: ['xlink:href', 'href'],
    use: ['xlink:href', 'href'],
  },
} as const

export const transformAssetUrl: NodeTransform = (
  node,
  context,
) => {
  if (node.type !== NodeTypes.ELEMENT) {
    return
  }

  if (!node.props.length) {
    return
  }

  const isVapor = 'ir' in context
  const imports = isVapor
    ? (context as unknown as VaporTransformContext).ir.imports
    : context.imports
  const bindingMetadata = isVapor
    ? (context as unknown as VaporTransformContext).options.bindingMetadata
    : context.bindingMetadata

  const tags = defaultAssetUrlOptions.tags
  const attrs = tags[node.tag as keyof typeof tags]
  if (!attrs) {
    return
  }

  const assetAttrs = (attrs || []) as readonly string[]
  node.props.forEach((attr, index) => {
    if (
      attr.type !== NodeTypes.ATTRIBUTE
      || !assetAttrs.includes(attr.name)
      || !attr.value
      || isExternalUrl(attr.value.content)
      || isDataUrl(attr.value.content)
      || attr.value.content[0] === '#'
      || !isRelativeUrl(attr.value.content)
    ) {
      return
    }

    // transform the url into an import.
    // this assumes a bundler will resolve the import into the correct
    // absolute url (e.g. webpack file-loader)
    const url = parseUrl(attr.value.content)
    const exp = getImportsExpressionExp(
      url.path,
      url.hash,
      attr.loc,
      context,
      imports,
      bindingMetadata,
    )
    node.props[index] = {
      type: NodeTypes.DIRECTIVE,
      name: 'bind',
      arg: createSimpleExpression(attr.name, true, attr.loc),
      exp,
      modifiers: [],
      loc: attr.loc,
    }
  })
}

function getImportsExpressionExp(
  path: string | null,
  hash: string | null,
  loc: SourceLocation,
  context: TransformContext,
  imports: ImportItem[],
  bindingMetadata: BindingMetadata,
): ExpressionNode {
  if (path) {
    let name: string
    let exp: SimpleExpressionNode
    const existingIndex = imports.findIndex(i => i.path === path)
    if (existingIndex > -1) {
      name = `_imports_${existingIndex}`
      exp = imports[existingIndex].exp as SimpleExpressionNode
    }
    else {
      name = `_imports_${imports.length}`
      exp = createSimpleExpression(
        name,
        false,
        loc,
        ConstantTypes.CAN_STRINGIFY,
      )

      // We need to ensure the path is not encoded (to %2F),
      // so we decode it back in case it is encoded
      imports.push({
        exp,
        path: decodeURIComponent(path),
      })
      bindingMetadata[name] = VueBindingTypes.LITERAL_CONST
    }

    if (!hash) {
      return exp
    }

    const hashExp = `${name} + '${hash}'`
    const finalExp = createSimpleExpression(
      hashExp,
      false,
      loc,
      ConstantTypes.CAN_STRINGIFY,
    )

    if (!context.hoistStatic) {
      return finalExp
    }

    const existingHoistIndex = context.hoists.findIndex((h) => {
      return (
        h
        && h.type === NodeTypes.SIMPLE_EXPRESSION
        && !h.isStatic
        && h.content === hashExp
      )
    })
    if (existingHoistIndex > -1) {
      return createSimpleExpression(
        `_hoisted_${existingHoistIndex + 1}`,
        false,
        loc,
        ConstantTypes.CAN_STRINGIFY,
      )
    }
    return context.hoist(finalExp)
  }
  else {
    return createSimpleExpression(`''`, false, loc, ConstantTypes.CAN_STRINGIFY)
  }
}
