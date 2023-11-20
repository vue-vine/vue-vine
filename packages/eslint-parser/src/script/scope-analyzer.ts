import type * as escopeTypes from 'eslint-scope'
import type { VineESLintParserOptions } from '../types'
import type {
  ESLintIdentifier,
  ESLintProgram,
  Reference,
  Variable,
} from '../ast'
import { getFallbackKeys } from '../ast'
import { getEslintScope } from '../common/eslint-scope'
import { getEcmaVersionIfUseEspree } from '../common/espree'

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
