import type {
  Expression,
  Node,
  TemplateLiteral,
  TSExpressionWithTypeArguments,
  TSIndexedAccessType,
  TSInterfaceDeclaration,
  TSLiteralType,
  TSMappedType,
  TSPropertySignature,
  TSType,
  TSTypeElement,
  TSTypeReference,
} from '@babel/types'
import type { MaybeWithScope, ResolvedElements, ScopeTypeNode, TypeResolveContext } from './types'
import { fileToScope } from './cache'
import { resolveWithTS } from './module'
import { createChildScope, recordImports, TypeScope } from './scope'
import { getId } from './utils'

/**
 * Core class for resolving TypeScript types
 */
export class TypeResolver {
  private scope: TypeScope

  constructor(private ctx: TypeResolveContext) {
    this.scope = new TypeScope(
      ctx.filename,
      ctx.source,
      0,
      recordImports(ctx.ast),
      Object.create(null),
      Object.create(null),
    )

    // Collect current file's types
    for (const stmt of ctx.ast) {
      if (stmt.type === 'TSTypeAliasDeclaration') {
        const node = stmt as ScopeTypeNode
        node._ownerScope = this.scope
        this.scope.types[stmt.id.name] = node
        this.resolveTypeElements(stmt.typeAnnotation, this.scope)
      }
      else if (stmt.type === 'TSInterfaceDeclaration') {
        const node = stmt as ScopeTypeNode
        node._ownerScope = this.scope
        this.scope.types[stmt.id.name] = node
        this.resolveTypeElements(node, this.scope)
      }
    }

    ctx.currentScope = this.scope
  }

  /**
   * Resolve type elements from a node
   */
  resolveTypeElements(
    node: Node & MaybeWithScope,
    scope?: TypeScope,
    typeParameters?: Record<string, Node>,
  ): ResolvedElements {
    const canCache = !typeParameters
    if (canCache && (node as any)._resolvedElements) {
      return (node as any)._resolvedElements
    }
    const resolved = this.innerResolveTypeElements(
      node,
      node._ownerScope || scope || this.scope,
      typeParameters,
    )
    return canCache ? ((node as any)._resolvedElements = resolved) : resolved
  }

  private innerResolveTypeElements(
    node: Node,
    scope: TypeScope,
    typeParameters?: Record<string, Node>,
  ): ResolvedElements {
    if (
      node.leadingComments?.some(c => c.value.includes('@vue-vine-ignore'))
    ) {
      return { props: {} }
    }

    switch (node.type) {
      case 'TSTypeLiteral':
        return this.typeElementsToMap(node.members, scope, typeParameters)

      case 'TSInterfaceDeclaration':
        return this.resolveInterfaceMembers(node, scope, typeParameters)

      case 'TSTypeAliasDeclaration':
      case 'TSTypeAnnotation':
      case 'TSParenthesizedType':
        return this.resolveTypeElements(
          node.typeAnnotation,
          scope,
          typeParameters,
        )

      case 'TSUnionType':
        return this.mergeElements(
          node.types.map(t =>
            this.resolveTypeElements(t, scope, typeParameters),
          ),
          'union',
        )

      case 'TSIntersectionType':
        return this.mergeElements(
          node.types.map(t =>
            this.resolveTypeElements(t, scope, typeParameters),
          ),
          'intersection',
        )

      case 'TSMappedType':
        return this.resolveMappedType(node, scope, typeParameters)

      case 'TSIndexedAccessType': {
        const types = this.resolveIndexType(node, scope)
        return this.mergeElements(
          types.map(t =>
            this.resolveTypeElements(t, t._ownerScope),
          ),
          'union',
        )
      }

      case 'TSTypeReference':
      case 'TSExpressionWithTypeArguments': {
        const resolved = this.resolveTypeReference(node, scope)
        if (resolved) {
          let typeParams: Record<string, Node> | undefined
          if (
            (resolved.type === 'TSTypeAliasDeclaration'
              || resolved.type === 'TSInterfaceDeclaration')
            && resolved.typeParameters
            && node.typeParameters
          ) {
            typeParams = Object.create(null)
            resolved.typeParameters.params.forEach((p, i) => {
              typeParams![p.name]
                = (typeParameters && typeParameters[p.name])
                || node.typeParameters!.params[i]
            })
          }
          return this.resolveTypeElements(
            resolved,
            resolved._ownerScope,
            typeParams,
          )
        }
        break
      }

      case 'TSImportType': {
        const sourceScope = this.importSourceToScope(
          node.argument,
          scope,
          node.argument.value,
        )
        if (!sourceScope) {
          return { props: {} }
        }
        const importResolved = this.resolveTypeReference(node, sourceScope)
        if (importResolved) {
          return this.resolveTypeElements(
            importResolved,
            importResolved._ownerScope,
          )
        }
        return { props: {} }
      }

      case 'TSTypeQuery': {
        const queryResolved = this.resolveTypeReference(node, scope)
        if (queryResolved) {
          return this.resolveTypeElements(
            queryResolved,
            queryResolved._ownerScope,
          )
        }
        break
      }
    }

    return { props: {} }
  }

  /**
   * Convert type elements to a map of properties
   */
  private typeElementsToMap(
    elements: TSTypeElement[],
    scope = this.scope,
    typeParameters?: Record<string, Node>,
  ): ResolvedElements {
    const res: ResolvedElements = { props: {} }

    for (const e of elements) {
      // 只处理 PropertySignature 和 MethodSignature
      if (e.type !== 'TSPropertySignature' && e.type !== 'TSMethodSignature') {
        continue
      }

      if (typeParameters) {
        scope = createChildScope(scope)
        scope.isGenericScope = true
        Object.assign(scope.types, typeParameters)
      }
      ;(e as MaybeWithScope)._ownerScope = scope

      const name = getId(e.key)
      if (name && !e.computed) {
        res.props[name] = e as ResolvedElements['props'][string]
      }
      else if (e.key.type === 'TemplateLiteral') {
        for (const key of this.resolveTemplateKeys(e.key, scope)) {
          res.props[key] = e as ResolvedElements['props'][string]
        }
      }
    }

    return res
  }

  /**
   * Resolve interface members including inherited ones
   */
  private resolveInterfaceMembers(
    node: TSInterfaceDeclaration, // 直接使用具体类型
    scope: TypeScope,
    typeParameters?: Record<string, Node>,
  ): ResolvedElements {
    const elements: ResolvedElements[] = []

    // Handle extends
    if (node.extends) {
      for (const ext of node.extends) {
        // Ensure ext is TSTypeReference
        if (ext.type === 'TSExpressionWithTypeArguments') {
          const resolved = this.resolveTypeReference(ext, scope)
          if (resolved) {
            elements.push(
              this.resolveTypeElements(resolved, resolved._ownerScope, typeParameters),
            )
          }
        }
      }
    }

    elements.push(
      this.typeElementsToMap(node.body.body, scope, typeParameters),
    )

    return this.mergeElements(elements, 'intersection')
  }

  /**
   * Merge multiple resolved elements
   */
  private mergeElements(
    elements: ResolvedElements[],
    mode: 'union' | 'intersection' = 'intersection',
  ): ResolvedElements {
    const result: ResolvedElements = { props: {} }

    // For unions, we need to collect all possible props
    // For intersections, we only keep props that appear in all elements
    const propNames = new Set<string>()
    elements.forEach((el) => {
      Object.keys(el.props).forEach(key => propNames.add(key))
    })

    for (const key of propNames) {
      const props = elements
        .map(e => e.props[key])
        .filter(Boolean)

      if (mode === 'intersection') {
        // For intersections, we merge all props
        if (props.length > 0) {
          result.props[key] = {
            ...props[0],
            // If this prop is required in any of the types,
            // it's required in the intersection
            optional: props.every(p => p.optional),
          }
        }
      }
      else if (mode === 'union') {
        // For unions, we only keep props that appear in all elements
        if (props.length === elements.length) {
          result.props[key] = {
            ...props[0],
            // If this prop is optional in any of the types,
            // it's optional in the union
            optional: props.some(p => p.optional),
          }
        }
      }
    }

    return result
  }

  /**
   * Resolve mapped type (e.g. { [K in keyof T]: T[K] })
   */
  private resolveMappedType(
    node: TSMappedType,
    scope: TypeScope,
    typeParameters?: Record<string, Node>,
  ): ResolvedElements {
    const typeParam = node.typeParameter
    const sourceType = this.resolveTypeReference(
      typeParam.constraint!,
      scope,
    )
    if (!sourceType) {
      return { props: {} }
    }

    const elements = this.resolveTypeElements(
      sourceType,
      sourceType._ownerScope,
      typeParameters,
    )

    const res: ResolvedElements = { props: {} }
    for (const key in elements.props) {
      res.props[key] = {
        ...elements.props[key],
        // node.optional may be: true, false, '+', '-'
        optional: node.optional === '+' || node.optional === true,
      }
    }
    return res
  }

  /**
   * Resolve indexed access type (e.g. T['key'])
   */
  private resolveIndexType(
    node: TSIndexedAccessType,
    scope: TypeScope,
  ): ScopeTypeNode[] {
    const objType = this.resolveTypeReference(node.objectType, scope)
    if (!objType)
      return []

    const indexType = this.resolveTypeReference(node.indexType, scope)
    if (!indexType)
      return []

    if (indexType.type === 'TSLiteralType') {
      const key = getId(indexType.literal)
      const elements = this.resolveTypeElements(objType, objType._ownerScope)
      return key && elements.props[key] ? [elements.props[key]] : []
    }

    const indexElements = this.resolveTypeElements(indexType, indexType._ownerScope)
    const objElements = this.resolveTypeElements(objType, objType._ownerScope)
    return Object.keys(indexElements.props)
      .map(key => objElements.props[key])
      .filter(Boolean)
  }

  /**
   * Resolve type reference to its declaration
   */
  private resolveTypeReference(
    node: Node,
    scope: TypeScope,
  ): ScopeTypeNode | undefined {
    if (node.type === 'TSTypeReference') {
      const typeName = getId(node.typeName)
      if (!typeName)
        return

      // Handle built-in utility types
      if (this.isBuiltInType(typeName)) {
        return this.resolveBuiltInType(node, scope)
      }

      // Check local scope first
      const local = scope.types[typeName]
      if (local)
        return local

      // Check imported types
      const imported = scope.imports[typeName]
      if (imported) {
        return this.resolveImportedType(imported, typeName, scope)
      }
    }

    if (node.type === 'TSExpressionWithTypeArguments') {
      const typeName = getId(node.expression)
      if (!typeName)
        return

      const local = scope.types[typeName]
      if (local)
        return local

      const imported = scope.imports[typeName]
      if (imported) {
        return this.resolveImportedType(imported, typeName, scope)
      }
    }

    if (node.type === 'TSTypeQuery') {
      const target = node.exprName
      if (target.type !== 'Identifier')
        return

      const local = scope.types[target.name] || scope.declares[target.name]
      if (local)
        return local

      const imported = scope.imports[target.name]
      if (imported) {
        return this.resolveImportedType(imported, target.name, scope)
      }
    }

    return undefined
  }

  /**
   * Resolve template literal keys
   */
  private resolveTemplateKeys(
    node: TemplateLiteral,
    scope: TypeScope,
  ): string[] {
    const results: string[] = []

    if (node.expressions.length === 0) {
      results.push(node.quasis[0].value.raw)
      return results
    }

    // For now, we only handle simple string unions in template expressions
    for (const exp of node.expressions) {
      const type = this.resolveTypeReference(exp as Node, scope)
      if (!type || type.type !== 'TSUnionType')
        return []

      const strings = type.types.filter(t =>
        t.type === 'TSLiteralType'
        && t.literal.type !== 'TemplateLiteral'
        && t.literal.type !== 'UnaryExpression'
        && typeof t.literal.value === 'string',
      ) as TSLiteralType[]

      if (strings.length !== type.types.length)
        return []

      // Combine all possible values
      const values = strings.map(t => (t.literal as any).value as string)
      const prefix = node.quasis[0].value.raw
      const suffix = node.quasis[1].value.raw
      values.forEach(v => results.push(prefix + v + suffix))
    }

    return results
  }

  /**
   * Check if type is a built-in utility type
   */
  private isBuiltInType(name: string): boolean {
    return [
      'Pick',
      'Omit',
      'Partial',
      'Required',
      'Readonly',
      'Record',
      'Extract',
      'Exclude',
    ].includes(name)
  }

  /**
   * Resolve built-in utility types
   */
  private resolveBuiltInType(
    node: TSTypeReference | TSExpressionWithTypeArguments,
    scope: TypeScope,
  ): ScopeTypeNode | undefined {
    if (!node.typeParameters?.params.length)
      return

    const typeName = node.type === 'TSTypeReference'
      ? getId(node.typeName)
      : getId(node.expression)

    const [firstArg, secondArg] = node.typeParameters.params
    const sourceType = this.resolveTypeReference(firstArg, scope)

    if (!sourceType)
      return

    const elements = this.resolveTypeElements(sourceType, sourceType._ownerScope)
    const result: ResolvedElements = { props: {} }

    switch (typeName) {
      case 'Pick':
      case 'Omit': {
        if (!secondArg)
          return
        const keys = this.getKeysFromType(secondArg, scope)
        for (const key of keys) {
          if (typeName === 'Pick' ? elements.props[key] : !elements.props[key]) {
            result.props[key] = elements.props[key]
          }
        }
        break
      }

      case 'Partial':
      case 'Required':
      case 'Readonly':
        Object.keys(elements.props).forEach((key) => {
          result.props[key] = {
            ...elements.props[key],
            optional: typeName === 'Partial',
          }
        })
        break

      case 'Record': {
        if (!secondArg)
          return
        const keys = this.getKeysFromType(firstArg, scope)
        for (const key of keys) {
          const prop: TSPropertySignature & { _ownerScope: TypeScope } = {
            type: 'TSPropertySignature',
            key: {
              type: 'Identifier',
              name: key,
            },
            computed: false,
            kind: 'get',
            optional: false,
            typeAnnotation: {
              type: 'TSTypeAnnotation',
              typeAnnotation: secondArg,
            },
            _ownerScope: scope,
          }
          result.props[key] = prop
        }
        break
      }

      case 'Extract':
      case 'Exclude': {
        if (!secondArg)
          return

        // Implement Extract/Exclude utility types
        const keys = this.getKeysFromType(secondArg, scope)
        for (const key in elements.props) {
          if (typeName === 'Extract' ? keys.includes(key) : !keys.includes(key)) {
            result.props[key] = elements.props[key]
          }
        }

        break
      }
    }

    return result as unknown as ScopeTypeNode
  }

  /**
   * Get keys from a type (used for Record, Pick, Omit)
   */
  private getKeysFromType(
    node: TSType,
    scope: TypeScope,
  ): string[] {
    if (node.type === 'TSLiteralType') {
      const value = (node.literal as any).value
      return typeof value === 'string' ? [value] : []
    }

    if (node.type === 'TSUnionType') {
      return node.types.flatMap(t => this.getKeysFromType(t, scope))
    }

    const resolved = this.resolveTypeReference(node, scope)
    if (!resolved)
      return []

    const elements = this.resolveTypeElements(resolved, resolved._ownerScope)
    return Object.keys(elements.props)
  }

  /**
   * Resolve imported type
   */
  private resolveImportedType(
    importedType: { source: string, imported?: string },
    local: string,
    scope: TypeScope,
  ): ScopeTypeNode | undefined {
    const { source, imported = local } = importedType
    const sourceScope = this.importSourceToScope(
      { value: source } as Expression,
      scope,
      source,
    )
    return sourceScope?.types[imported]
  }

  /**
   * Resolve import source to scope
   */
  private importSourceToScope(
    source: Expression,
    scope: TypeScope,
    sourceString: string,
  ): TypeScope | undefined {
    if (source.type !== 'StringLiteral') {
      return undefined
    }

    const filename = this.ctx.filename
    if (!filename) {
      return undefined
    }

    // Try resolving from TS first
    if (this.ctx.fs) {
      const resolved = resolveWithTS(filename, sourceString, this.ctx.fs)
      if (resolved) {
        this.loadTypeSource(resolved)
        return fileToScope.get(resolved)
      }
    }

    return undefined
  }

  /**
   * Load and parse type source file
   */
  private loadTypeSource(filename: string) {
    if (
      !this.ctx.fs
      || fileToScope.has(filename)
      || !this.ctx.loadFile
    ) {
      return
    }

    const content = this.ctx.fs.readFile(filename)
    if (!content) {
      return
    }

    const parsed = this.ctx.loadFile(filename, content)
    if (!parsed) {
      return
    }

    if (parsed.type === 'Program') {
      const scope = new TypeScope(
        filename,
        content,
        0,
        Object.create(null), // imports
        Object.create(null), // types
        Object.create(null), // declares
      )
      fileToScope.set(filename, scope)

      // Process type declarations in the file
      for (const stmt of parsed.body) {
        if (
          stmt.type === 'TSTypeAliasDeclaration'
          || stmt.type === 'TSInterfaceDeclaration'
        ) {
          const id = stmt.id.name
          scope.types[id] = {
            ...stmt,
            _ownerScope: scope,
          }
        }
      }
    }
  }
}
