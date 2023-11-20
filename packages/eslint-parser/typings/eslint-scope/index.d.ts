import type * as estree from "estree"
import type { VisitorKeys } from "eslint-visitor-keys"

export interface AnalysisOptions {
    optimistic?: boolean
    directive?: boolean
    ignoreEval?: boolean
    nodejsScope?: boolean
    impliedStrict?: boolean
    fallback?: string | Function
    sourceType?: "script" | "module"
    ecmaVersion?: number
    childVisitorKeys?: VisitorKeys
}

export interface ScopeManager {
    scopes: Scope[]
    globalScope: Scope
    acquire(node: estree.Node, inner: boolean): Scope | null
    acquireAll(node: estree.Node): Scope[]
}

export interface Scope {
    block: estree.Node
    childScopes: Scope[]
    directCallToEcalScope: boolean
    dynamic: boolean
    functionExpressionScope: boolean
    isStrict: boolean
    references: Reference[]
    set: Map<string, Variable>
    taints: Map<string, boolean>
    thisFound: boolean
    through: Reference[]
    type: string
    upper: Scope | null
    variables: Variable[]
    variableScope: Scope
}

export class Variable {
    public defs: VariableDefinition[]
    public identifiers: estree.Identifier[]
    public name: string
    public references: Reference[]
    public scope: Scope
    public stack: boolean
}

export interface VariableDefinition {
    type: string
    name: estree.Identifier
    node: estree.Node
    parent?: estree.Node
}

export class Reference {
    public from: Scope
    public identifier: estree.Identifier
    public partial: boolean
    public resolved: Variable | null
    public tainted: boolean
    public writeExpr: estree.Expression

    public isRead(): boolean
    public isReadOnly(): boolean
    public isReadWrite(): boolean
    public isStatic(): boolean
    public isWrite(): boolean
    public isWriteOnly(): boolean

    // For typescript-eslint
    public isTypeReference?: boolean
    public isValueReference?: boolean
}

export declare const analyze: (
    ast: object,
    options?: AnalysisOptions,
) => ScopeManager
export declare const version: string
