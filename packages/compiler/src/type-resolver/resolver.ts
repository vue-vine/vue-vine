import type {
  Expression,
  Node,
  TemplateLiteral,
  TSExpressionWithTypeArguments,
  TSIndexedAccessType,
  TSInterfaceDeclaration,
  TSMappedType,
  TSPropertySignature,
  TSType,
  TSTypeElement,
  TSTypeParameterDeclaration,
  TSTypeReference,
} from '@babel/types'
import type { MaybeWithScope, ResolvedElements, ScopeTypeNode, TypeResolveContext, WithScope } from './types'
import { hasOwn } from '@vue/shared'
import { fileToScope } from './cache'
import { resolveWithTS } from './module'
import { createChildScope, recordImports, TypeScope } from './scope'
import { getId } from './utils'

function createProperty(
  key: Expression,
  typeAnnotation: TSType,
  scope: TypeScope,
  optional: boolean,
): TSPropertySignature & WithScope {
  return {
    type: 'TSPropertySignature',
    key,
    kind: 'get',
    optional,
    typeAnnotation: {
      type: 'TSTypeAnnotation',
      typeAnnotation,
    },
    _ownerScope: scope,
  }
}

// Add type calculator type
type TypeCalculator = (params: TSType[]) => ResolvedElements

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
    )

    // Collect current file's types
    for (const stmt of ctx.ast) {
      const node = (
        stmt.type === 'TSTypeAliasDeclaration'
          ? stmt.typeAnnotation
          : stmt.type === 'TSInterfaceDeclaration'
            ? stmt
            : (void 0)
      ) as ScopeTypeNode
      const id = (
        stmt.type === 'TSTypeAliasDeclaration'
          ? stmt.id.name
          : stmt.type === 'TSInterfaceDeclaration'
            ? stmt.id.name
            : (void 0)
      )
      const typeParameters = (
        stmt.type === 'TSTypeAliasDeclaration'
          ? stmt.typeParameters
          : stmt.type === 'TSInterfaceDeclaration'
            ? stmt.typeParameters
            : (void 0)
      )

      if (!node || !id) {
        continue
      }

      node._ownerScope = this.scope
      this.scope.types[id] = node

      if (typeParameters) {
        // Resolve calculator for generic type declaration
        this.resolveTypeCalculation(node, this.scope, typeParameters)
      }
      else {
        // Resolve elements for non-generic or immediate use
        this.resolveTypeElements(node, this.scope, typeParameters)
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
    typeParameters?: TSTypeParameterDeclaration | null,
  ): ResolvedElements {
    // Only cache non-generic types
    const canCache = !typeParameters
      && !this.hasTypeParameters(node)
      && !scope?.isGenericScope

    if (canCache && (node as any)._resolvedElements) {
      return (node as any)._resolvedElements
    }
    const resolved = this.innerResolveTypeElements(
      node,
      scope || node._ownerScope || this.scope,
      typeParameters,
    )
    return canCache ? ((node as any)._resolvedElements = resolved) : resolved
  }

  /**
   * Resolve type calculation for generic types
   */
  private resolveTypeCalculation(
    node: ScopeTypeNode,
    scope: TypeScope,
    typeParams: TSTypeParameterDeclaration,
  ): TypeCalculator {
    // Cache calculator if not already cached
    if (!(node as any)._resolvedCalculator) {
      const calculator = (params: TSType[]) => {
        // Create child scope for generic parameters
        const calculationScope = createChildScope(scope)
        calculationScope.isGenericScope = true

        // Create a new types object that shadows parent's types
        calculationScope.types = Object.create(null)

        // Map type parameters to passed arguments first
        typeParams.params.forEach((param, index) => {
          if (params[index]) {
            calculationScope.types[param.name] = {
              ...params[index],
              _ownerScope: calculationScope,
            } as ScopeTypeNode
          }
        })

        // Then inherit parent scope's types
        Object.assign(calculationScope.types, {
          ...scope.types,
          // Exclude any names that conflict with type parameters
          ...Object.fromEntries(
            Object.entries(scope.types)
              .filter(([key]) => !(key in calculationScope.types)),
          ),
        })

        // Resolve with mapped parameters
        return this.resolveTypeElements(
          node,
          calculationScope,
          typeParams,
        )
      }

      ;(node as any)._resolvedCalculator = calculator
    }

    return (node as any)._resolvedCalculator
  }

  /**
   * Check if a node contains type parameters
   */
  private hasTypeParameters(node: Node): boolean {
    return !!(
      (node as any).typeParameters
      || (node as any).typeParameter
      || (node.type === 'TSTypeAliasDeclaration' && node.typeAnnotation.type === 'TSTypeReference')
    )
  }

  private innerResolveTypeElements(
    node: Node,
    scope: TypeScope,
    typeParameters?: TSTypeParameterDeclaration | null,
  ): ResolvedElements {
    if (
      node.leadingComments?.some(c => c.value.includes('@vue-vine-ignore'))
    ) {
      return { props: {} }
    }

    switch (node.type) {
      // Handle literal type directly
      case 'TSLiteralType': {
        const value = (node.literal as any).value
        if (typeof value === 'string') {
          return {
            props: {
              [value]: createProperty(
                {
                  type: 'Identifier',
                  name: value,
                },
                {
                  type: 'TSAnyKeyword',
                },
                scope,
                false,
              ),
            },
          }
        }
        return { props: {} }
      }

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
          'TSUnionType',
        )

      case 'TSIntersectionType':
        return this.mergeElements(
          node.types.map(t =>
            this.resolveTypeElements(t, scope, typeParameters),
          ),
          'TSIntersectionType',
        )

      case 'TSMappedType':
        return this.resolveMappedType(node, scope, typeParameters)

      case 'TSIndexedAccessType': {
        const types = this.resolveIndexType(node, scope)
        return this.mergeElements(
          types.map(t =>
            this.resolveTypeElements(t, t._ownerScope),
          ),
          'TSUnionType',
        )
      }

      case 'TSTypeReference': {
        if (this.isBuiltInType(getId(node.typeName))) {
          return this.resolveBuiltInType(node, scope)
        }

        const local = scope.types[getId(node.typeName)]
        if (local) {
          if ((local as any)._resolvedCalculator && node.typeParameters) {
            const calculator = (local as any)._resolvedCalculator as TypeCalculator
            const resolvedParams = node.typeParameters.params.map(param =>
              this.resolveTypeReference(param, scope) ?? param,
            ).filter(Boolean) as TSType[]

            return calculator(resolvedParams)
          }
          return this.resolveTypeElements(local, local._ownerScope)
        }

        const resolved = this.resolveTypeReference(node, scope)
        if (resolved) {
          return this.resolveTypeElements(
            resolved.type === 'TSTypeAliasDeclaration'
              ? resolved.typeAnnotation
              : resolved,
          )
        }
        break
      }

      case 'TSExpressionWithTypeArguments': {
        const typeName = getId(node.expression)
        if (!typeName)
          return { props: {} }

        const local = scope.types[typeName]
        if (local)
          return this.resolveTypeElements(local, local._ownerScope)

        const imported = scope.imports[typeName]
        if (imported) {
          const resolvedImportedType = this.resolveImportedType(imported, typeName, scope)
          if (resolvedImportedType) {
            return this.resolveTypeElements(resolvedImportedType, resolvedImportedType._ownerScope)
          }
        }
        break
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
    }

    return { props: {} }
  }

  /**
   * Convert type elements to a map of properties
   */
  private typeElementsToMap(
    elements: TSTypeElement[],
    scope = this.scope,
    typeParameters?: TSTypeParameterDeclaration | null,
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
    typeParameters?: TSTypeParameterDeclaration | null,
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

    return this.mergeElements(
      elements,
      'TSIntersectionType',
    )
  }

  /**
   * Merge multiple resolved elements
   */
  private mergeElements(
    elements: ResolvedElements[],
    type: 'TSUnionType' | 'TSIntersectionType',
  ): ResolvedElements {
    if (elements.length === 1)
      return elements[0]
    const res: ResolvedElements = { props: {} }
    const { props: baseProps } = res
    for (const { props } of elements) {
      for (const key in props) {
        if (!hasOwn(baseProps, key)) {
          baseProps[key] = props[key]
        }
        else {
          baseProps[key] = createProperty(
            baseProps[key].key,
            {
              type,
              // @ts-expect-error - Merging by union/intersection
              types: [baseProps[key], props[key]],
            },
            baseProps[key]._ownerScope,
            baseProps[key].optional || props[key].optional,
          )
        }
      }
    }

    return res
  }

  /**
   * Resolve mapped type (e.g. { [K in keyof T]: T[K] })
   */
  private resolveMappedType(
    node: TSMappedType,
    scope: TypeScope,
    typeParameters?: TSTypeParameterDeclaration | null,
  ): ResolvedElements {
    const typeParam = node.typeParameter
    const constraint = typeParam.constraint!

    // Handle literal type directly
    if (constraint.type === 'TSLiteralType') {
      if (constraint.literal.type === 'StringLiteral') {
        const value = constraint.literal.value
        return {
          props: {
            [value]: createProperty(
              { type: 'Identifier', name: value },
              node.typeAnnotation || { type: 'TSAnyKeyword' },
              scope,
              node.optional === '+' || node.optional === true,
            ),
          },
        }
      }
      // Handle template literal type
      else if (constraint.literal.type === 'TemplateLiteral') {
        const keys = this.resolveTemplateKeys(constraint.literal, scope)
        const res: ResolvedElements = { props: {} }
        for (const key of keys) {
          res.props[key] = createProperty(
            { type: 'Identifier', name: key },
            node.typeAnnotation || { type: 'TSAnyKeyword' },
            scope,
            node.optional === '+' || node.optional === true,
          )
        }
        return res
      }
    }

    // Handle different constraint types for mapped types
    switch (constraint.type) {
      case 'TSTypeOperator':
        // Handle keyof operator
        if (constraint.operator === 'keyof') {
          const targetType = this.resolveTypeReference(constraint.typeAnnotation, scope)
          if (!targetType) {
            return { props: {} }
          }
          const elements = this.resolveTypeElements(targetType, targetType._ownerScope)
          const res: ResolvedElements = { props: {} }
          for (const key in elements.props) {
            res.props[key] = createProperty(
              { type: 'Identifier', name: key },
              node.typeAnnotation || { type: 'TSAnyKeyword' },
              scope,
              node.optional === '+' || node.optional === true,
            )
          }
          return res
        }
        break

      case 'TSIntersectionType':
        // Handle intersection types like [K in A & B]
        return this.mergeElements(
          constraint.types.map(t =>
            this.resolveMappedType(
              { ...node, typeParameter: { ...typeParam, constraint: t } },
              scope,
            ),
          ),
          'TSIntersectionType',
        )

      case 'TSUnionType':
        // Handle union types like [K in A | B]
        return this.mergeElements(
          constraint.types.map(t =>
            this.resolveMappedType(
              { ...node, typeParameter: { ...typeParam, constraint: t } },
              scope,
            ),
          ),
          'TSUnionType',
        )
    }

    // Fallback to default resolution
    const sourceType = this.resolveTypeReference(constraint, scope)
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
      return (key && elements.props[key] ? [elements.props[key]] : []) as ScopeTypeNode[]
    }

    const indexElements = this.resolveTypeElements(indexType, indexType._ownerScope)
    const objElements = this.resolveTypeElements(objType, objType._ownerScope)
    return (
      Object.keys(indexElements.props)
        .map(key => objElements.props[key])
        .filter(Boolean)
    ) as ScopeTypeNode[]
  }

  /**
   * Resolve type reference to its declaration
   */
  private resolveTypeReference(
    node: Node,
    scope: TypeScope,
  ): ScopeTypeNode | undefined {
    switch (node.type) {
      case 'TSTypeReference': {
        const typeName = getId(node.typeName)
        if (!typeName)
          return

        // Handle built-in utility types
        if (this.isBuiltInType(typeName)) {
          return {
            ...node,
            _ownerScope: scope,
          }
        }

        // Check local scope first
        const local = scope.types[typeName]
        if (local) {
          return local
        }

        // Check imported types
        const imported = scope.imports[typeName]
        if (imported) {
          return this.resolveImportedType(imported, typeName, scope)
        }

        break
      }
      case 'TSExpressionWithTypeArguments': {
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

        break
      }
      case 'TSTypeQuery': {
        const target = node.exprName
        if (target.type !== 'Identifier')
          return

        const local = scope.types[target.name]
        if (local)
          return local

        const imported = scope.imports[target.name]
        if (imported) {
          return this.resolveImportedType(imported, target.name, scope)
        }

        break
      }
      case 'TSIntersectionType':
      case 'TSUnionType': {
        // If scope.isGenericScope = true, try resolve types in union/intersection
        if (scope.isGenericScope) {
          node.types.forEach((t, i) => {
            const resolved = this.resolveTypeReference(t, scope)
            if (resolved) {
              node.types[i] = resolved as TSType
            }
          })
        }

        break
      }
    }

    return (void 0)
  }

  /**
   * Resolve template literal keys
   */
  private resolveTemplateKeys(
    node: TemplateLiteral,
    scope: TypeScope,
  ): string[] {
    if (node.expressions.length === 0) {
      return [node.quasis[0].value.raw]
    }

    const expValues: string[][] = []

    for (const exp of node.expressions) {
      const type = this.resolveTypeReference(exp as Node, scope)
      if (!type)
        return []

      const values: string[] = []
      if (type.type === 'TSUnionType') {
        // e.g. `${string | number}`
        for (const t of type.types) {
          if (t.type === 'TSLiteralType' && typeof (t.literal as any).value === 'string') {
            values.push((t.literal as any).value)
          }
        }
      }
      else if (type.type === 'TSLiteralType' && typeof (type.literal as any).value === 'string') {
        //  e.g. `${'foo'}`
        values.push((type.literal as any).value)
      }
      else if (type.type === 'TSTypeReference') {
        // Handle type references, including built-in utility types
        const typeName = getId(type.typeName)
        if (this.isBuiltInType(typeName)) {
          const resolvedType = this.resolveBuiltInType(type, scope)
          values.push(...Object.keys(resolvedType.props))
        }
      }

      if (values.length === 0)
        return []
      expValues.push(values)
    }

    // Generate all possible combinations
    let results: string[] = ['']
    for (let i = 0; i < expValues.length; i++) {
      const current = expValues[i]
      const newResults: string[] = []
      for (const prev of results) {
        for (const value of current) {
          newResults.push(prev + node.quasis[i].value.raw + value)
        }
      }
      results = newResults
    }

    return results.map(r => r + node.quasis[node.quasis.length - 1].value.raw)
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
      'Capitalize',
      'Uppercase',
      'Lowercase',
      'Uncapitalize',
    ].includes(name)
  }

  /**
   * Resolve built-in utility types
   */
  private resolveBuiltInType(
    node: TSTypeReference | TSExpressionWithTypeArguments,
    scope: TypeScope,
  ): ResolvedElements {
    const result: ResolvedElements = { props: {} }
    if (!node.typeParameters?.params.length)
      return result

    const typeName = node.type === 'TSTypeReference'
      ? getId(node.typeName)
      : getId(node.expression)

    const [firstArg, secondArg] = node.typeParameters.params
    const sourceType = this.resolveTypeReference(firstArg, scope)

    if (!sourceType)
      return result

    const elements = this.resolveTypeElements(sourceType, sourceType._ownerScope)

    switch (typeName) {
      case 'Pick':
      case 'Omit': {
        if (!secondArg)
          return result
        const keys = this.getKeysFromType(secondArg, scope)

        if (typeName === 'Pick') {
          for (const key of keys) {
            const prop = elements.props[key]
            if (prop) {
              result.props[key] = prop
            }
          }
        }
        else {
          for (const key in elements.props) {
            if (!keys.includes(key)) {
              result.props[key] = elements.props[key]
            }
          }
        }

        break
      }

      case 'Partial':
      case 'Required':
      case 'Readonly':
        Object.keys(elements.props).forEach((key) => {
          const original = elements.props[key]
          result.props[key] = {
            ...original,
            optional: (
              typeName === 'Readonly'
                ? original.optional
                : typeName === 'Partial'
            ),
          }
        })
        break

      case 'Record': {
        if (!secondArg)
          return result
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
          return result

        // Implement Extract/Exclude utility types
        const keys = this.getKeysFromType(secondArg, scope)
        for (const key in elements.props) {
          const prop = elements.props[key]
          if (
            (typeName === 'Extract' && keys.includes(key))
            || (typeName === 'Exclude' && !keys.includes(key))
          ) {
            result.props[key] = prop
          }
        }

        break
      }

      case 'Capitalize':
      case 'Uppercase':
      case 'Lowercase':
      case 'Uncapitalize': {
        const sourceElements = this.resolveTypeElements(firstArg, scope)
        const res: ResolvedElements = { props: {} }

        // Recursively process each property name
        for (const key of Object.keys(sourceElements.props)) {
          let transformedKey = key
          switch (typeName) {
            case 'Capitalize':
              transformedKey = key.charAt(0).toUpperCase() + key.slice(1)
              break
            case 'Uppercase':
              transformedKey = key.toUpperCase()
              break
            case 'Lowercase':
              transformedKey = key.toLowerCase()
              break
            case 'Uncapitalize':
              transformedKey = key.charAt(0).toLowerCase() + key.slice(1)
              break
          }
          res.props[transformedKey] = {
            ...sourceElements.props[key],
            key: {
              type: 'Identifier',
              name: transformedKey,
            },
          }
        }
        return res
      }
    }

    return result
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
