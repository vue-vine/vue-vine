import type * as escopeTypes from 'eslint-scope'
import type { TSESTree } from '@typescript-eslint/types'
import * as tsEscopeTypes from '@typescript-eslint/scope-manager'
import type { VineESLintParserOptions } from '../types'
import type {
  ESLintIdentifier,
  ESLintProgram,
  Reference,
  VAttribute,
  VDirective,
  VElement,
  VExpressionContainer,
  VTemplateRoot,
  Variable,
} from '../ast'
import { getFallbackKeys, traverseNodes } from '../ast'
import { getEslintScope } from '../common/eslint-scope'
import { getEcmaVersionIfUseEspree } from '../common/espree'

enum ReferenceFlag {
  Read = 1,
  Write = 2,
  ReadWrite = 3,
}
enum ReferenceTypeFlag {
  Value = 1,
  Type = 2,
}

const BUILTIN_COMPONENTS = new Set([
  'template',
  'slot',
  'component',
  'Component',
  'transition',
  'Transition',
  'transition-group',
  'TransitionGroup',
  'keep-alive',
  'KeepAlive',
  'teleport',
  'Teleport',
  'suspense',
  'Suspense',
])

const BUILTIN_DIRECTIVES = new Set([
  'bind',
  'on',
  'text',
  'html',
  'show',
  'if',
  'else',
  'else-if',
  'for',
  'model',
  'slot',
  'pre',
  'cloak',
  'once',
  'memo',
  'is',
])

/**
 * @see https://github.com/vuejs/core/blob/48de8a42b7fed7a03f7f1ff5d53d6a704252cafe/packages/shared/src/domTagConfig.ts#L5-L28
 */
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element
const HTML_TAGS
  = 'html,body,base,head,link,meta,style,title,address,article,aside,footer,'
  + 'header,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,'
  + 'figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,'
  + 'data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,'
  + 'time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,'
  + 'canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,'
  + 'th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,'
  + 'option,output,progress,select,textarea,details,dialog,menu,'
  + 'summary,template,blockquote,iframe,tfoot'

// https://developer.mozilla.org/en-US/docs/Web/SVG/Element
const SVG_TAGS
  = 'svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,'
  + 'defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,'
  + 'feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,'
  + 'feDistanceLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,'
  + 'feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,'
  + 'fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,'
  + 'foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,'
  + 'mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,'
  + 'polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,'
  + 'text,textPath,title,tspan,unknown,use,view'

const NATIVE_TAGS = new Set([...HTML_TAGS.split(','), ...SVG_TAGS.split(',')])

interface ParserResult {
  ast: ESLintProgram
  scopeManager?: escopeTypes.ScopeManager
}

/**
 * Check whether the given reference is unique in the belonging array.
 * @param reference The current reference to check.
 * @param index The index of the reference.
 * @param references The belonging array of the reference.
 */
function isUnique(
  reference: escopeTypes.Reference,
  index: number,
  references: escopeTypes.Reference[],
): boolean {
  return (
    index === 0 || reference.identifier !== references[index - 1].identifier
  )
}

/**
 * `casing.camelCase()` converts the beginning to lowercase,
 * but does not convert the case of the beginning character when converting with Vue3.
 * @see https://github.com/vuejs/vue-next/blob/48de8a42b7fed7a03f7f1ff5d53d6a704252cafe/packages/shared/src/index.ts#L109
 */
function camelize(str: string) {
  return str.replace(/-(\w)/gu, (_, c) => (c ? c.toUpperCase() : ''))
}

function capitalize(str: string) {
  return str[0].toUpperCase() + str.slice(1)
}

/**
 * Check whether a given variable has that definition.
 * @param variable The variable to check.
 * @returns `true` if the variable has that definition.
 */
function hasDefinition(variable: escopeTypes.Variable): boolean {
  return variable.defs.length >= 1
}

/**
 * Transform the given reference object.
 * @param reference The source reference object.
 * @returns The transformed reference object.
 */
function transformReference(reference: escopeTypes.Reference): Reference {
  const ret: Reference = {
    id: reference.identifier as ESLintIdentifier,
    mode: reference.isReadOnly()
      ? 'r'
      : reference.isWriteOnly()
        ? 'w'
        : /* otherwise */ 'rw',
    variable: null,
    isValueReference: reference.isValueReference,
    isTypeReference: reference.isTypeReference,
  }
  Object.defineProperty(ret, 'variable', { enumerable: false })

  return ret
}

/**
 * Transform the given variable object.
 * @param variable The source variable object.
 * @returns The transformed variable object.
 */
function transformVariable(
  variable: escopeTypes.Variable,
  kind: Variable['kind'],
): Variable {
  const ret: Variable = {
    id: variable.defs[0].name as ESLintIdentifier,
    kind,
    references: [],
  }
  Object.defineProperty(ret, 'references', { enumerable: false })

  return ret
}

/**
 * Get the `for` statement scope.
 * @param scope The global scope.
 * @returns The `for` statement scope.
 */
function getForScope(scope: escopeTypes.Scope): escopeTypes.Scope {
  const child = scope.childScopes[0]
  return child.block === scope.block ? child.childScopes[0] : child
}

export function analyzeScope(
  ast: ESLintProgram,
  parserOptions: VineESLintParserOptions,
): escopeTypes.ScopeManager {
  const ecmaVersion = getEcmaVersionIfUseEspree(parserOptions) || 2022
  const ecmaFeatures = parserOptions.ecmaFeatures || {}
  const sourceType = parserOptions.sourceType || 'script'
  const result = getEslintScope().analyze(ast, {
    ignoreEval: true,
    nodejsScope: false,
    impliedStrict: ecmaFeatures.impliedStrict,
    ecmaVersion,
    sourceType,
    fallback: getFallbackKeys,
  })

  return result
}

/**
 * Analyze the scope of the given AST.
 * @param {ParserResult} parserResult The parser result to analyze.
 * @param parserOptions
 */
function analyze(
  parserResult: ParserResult,
  parserOptions: VineESLintParserOptions,
): escopeTypes.Scope {
  const scopeManager
        = parserResult.scopeManager
        || analyzeScope(parserResult.ast, parserOptions)
  return scopeManager.globalScope
}

/**
 * Analyze the external references of the given AST.
 * @param {ParserResult} parserResult The parser result to analyze.
 * @returns {Reference[]} The reference objects of external references.
 */
export function analyzeExternalReferences(
  parserResult: ParserResult,
  parserOptions: VineESLintParserOptions,
): Reference[] {
  const scope = analyze(parserResult, parserOptions)
  return scope.through.filter(isUnique).map(transformReference)
}

/**
 * Analyze the external references of the given AST.
 * @param {ParserResult} parserResult The parser result to analyze.
 * @returns {Reference[]} The reference objects of external references.
 */
export function analyzeVariablesAndExternalReferences(
  parserResult: ParserResult,
  kind: Variable['kind'],
  parserOptions: VineESLintParserOptions,
): { variables: Variable[]; references: Reference[] } {
  const scope = analyze(parserResult, parserOptions)
  return {
    variables: getForScope(scope)
      .variables.filter(hasDefinition)
      .map(v => transformVariable(v, kind)),
    references: scope.through.filter(isUnique).map(transformReference),
  }
}

function collectVariablesForVCF(
  tsFileScopeManager: tsEscopeTypes.ScopeManager,
  templateRoot: VTemplateRoot,
) {
  const scriptVariables = new Map<string, tsEscopeTypes.Variable>()
  const globalScope = tsFileScopeManager.globalScope
  if (!globalScope) {
    return scriptVariables
  }
  for (const variable of globalScope.variables) {
    scriptVariables.set(variable.name, variable)
  }
  const moduleScope = globalScope.childScopes.find(
    scope => scope.type === 'module',
  )
  for (const variable of (moduleScope && moduleScope.variables) || []) {
    scriptVariables.set(variable.name, variable)
  }

  // After building custom `VTemplateRoot` AST, we'll be able to recursively
  // go through its ancestor nodes to find the Vine function declaration,
  // and use `scopeManager.nodeToScopeMap` to get its scope.
  let foundVCF: TSESTree.Node | undefined = templateRoot.parent
  let foundVCFScope: tsEscopeTypes.Scope
  if (templateRoot.parent) {
    do {
      foundVCF = foundVCF.parent
    } while ((
      foundVCF
      && foundVCF.type !== 'FunctionDeclaration'
      && foundVCF.type !== 'FunctionExpression'
      && foundVCF.type !== 'ArrowFunctionExpression'
    ))
    if (foundVCF) {
      const tryGetVCFScope = tsFileScopeManager.nodeToScope.get(foundVCF)
      if (tryGetVCFScope?.[0]) {
        foundVCFScope = tryGetVCFScope[0]

        for (const variable of foundVCFScope.variables) {
          scriptVariables.set(variable.name, variable)
        }
      }
    }
  }

  return scriptVariables
}

export function analyzeUsedInTemplateVariables(
  scopeManager: tsEscopeTypes.ScopeManager,
  templateRoot: VTemplateRoot,
) {
  const scriptVariables = collectVariablesForVCF(scopeManager, templateRoot)
  const markedVariables = new Set<string>()

  /**
   * @see https://github.com/vuejs/vue-next/blob/48de8a42b7fed7a03f7f1ff5d53d6a704252cafe/packages/compiler-core/src/transforms/transformElement.ts#L335
   */
  function markSetupReferenceVariableAsUsed(name: string) {
    if (scriptVariables.has(name)) {
      markVariableAsUsed(name)
      return true
    }
    const camelName = camelize(name)
    if (scriptVariables.has(camelName)) {
      markVariableAsUsed(camelName)
      return true
    }
    const pascalName = capitalize(camelName)
    if (scriptVariables.has(pascalName)) {
      markVariableAsUsed(pascalName)
      return true
    }
    return false
  }

  function markVariableAsUsed(nameOrRef: string | Reference) {
    let name: string
    let isValueReference: boolean | undefined
    let isTypeReference: boolean | undefined
    if (typeof nameOrRef === 'string') {
      name = nameOrRef
    }
    else {
      name = nameOrRef.id.name
      isValueReference = nameOrRef.isValueReference
      isTypeReference = nameOrRef.isTypeReference
    }
    const variable = scriptVariables.get(name)
    if (!variable || variable.identifiers.length === 0) {
      return
    }
    if (markedVariables.has(name)) {
      return
    }
    markedVariables.add(name)

    const reference = new tsEscopeTypes.Reference(
      variable.identifiers[0],
      variable.scope,
      ReferenceFlag.Read,
      undefined,
      undefined,
      undefined,
      isValueReference
        ? ReferenceTypeFlag.Value
        : isTypeReference
          ? ReferenceTypeFlag.Type
          : undefined,
    )
    ;(reference as any).vueUsedInTemplate = true // Mark for debugging.
    reference.isWrite = () => false
    reference.isWriteOnly = () => false
    reference.isRead = () => true
    reference.isReadOnly = () => true
    reference.isReadWrite = () => false

    variable.references.push(reference)
    reference.resolved = variable

    if (reference.isTypeReference) {
      // Rule @typescript-eslint/no-unused-vars will treat type references
      // at the same position as recursive references,
      // so without this flag it will be marked as unused.
      ;(variable as any).eslintUsed = true
    }
  }

  function processVExpressionContainer(node: VExpressionContainer) {
    for (const reference of node.references.filter(
      ref => ref.variable == null,
    )) {
      markVariableAsUsed(reference)
    }
  }

  function processVElement(node: VElement) {
    if (
      (node.rawName === node.name && NATIVE_TAGS.has(node.rawName))
          || BUILTIN_COMPONENTS.has(node.rawName)
    ) {
      return
    }
    if (!markSetupReferenceVariableAsUsed(node.rawName)) {
      // Check namespace
      // https://github.com/vuejs/vue-next/blob/48de8a42b7fed7a03f7f1ff5d53d6a704252cafe/packages/compiler-core/src/transforms/transformElement.ts#L306
      const dotIndex = node.rawName.indexOf('.')
      if (dotIndex > 0) {
        markSetupReferenceVariableAsUsed(
          node.rawName.slice(0, dotIndex),
        )
      }
    }
  }

  function processVAttribute(node: VAttribute | VDirective) {
    if (node.directive) {
      if (BUILTIN_DIRECTIVES.has(node.key.name.name)) {
        return
      }
      markSetupReferenceVariableAsUsed(`v-${node.key.name.rawName}`)
    }
    else if (node.key.name === 'ref' && node.value) {
      markVariableAsUsed(node.value.value)
    }
  }

  // Analyze template
  traverseNodes(templateRoot, {
    enterNode(node) {
      if (node.type === 'VExpressionContainer') {
        processVExpressionContainer(node)
      }
      else if (node.type === 'VElement') {
        processVElement(node)
      }
      else if (node.type === 'VAttribute') {
        processVAttribute(node)
      }
    },
    leaveNode() {
      /* noop */
    },
  })
}
