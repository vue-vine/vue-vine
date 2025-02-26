import type { SourceCode } from '@typescript-eslint/utils/ts-eslint'
import type { VDirective, VElement, VExpression } from '@vue-vine/eslint-parser'
import { createEslintRule, equalTokens, getDirective, prevSibling } from '../../utils'

interface OrOperands {
  node: VExpression
  operands: AndOperands[]
}
interface AndOperands {
  node: VExpression
  operands: VExpression[]
}

/**
 * Splits the given node by the given logical operator.
 * @param operator Logical operator `||` or `&&`.
 * @param node The node to split.
 * @returns Array of conditions that makes the node when joined by the operator.
 */
function splitByLogicalOperator(operator: string, node: VExpression): VExpression[] {
  if (node.type === 'LogicalExpression' && node.operator === operator) {
    return [
      ...splitByLogicalOperator(operator, node.left),
      ...splitByLogicalOperator(operator, node.right),
    ]
  }
  return [node]
}
function splitByOr(node: VExpression) {
  return splitByLogicalOperator('||', node)
}
function splitByAnd(node: VExpression) {
  return splitByLogicalOperator('&&', node)
}
function buildOrOperands(node: VExpression): OrOperands {
  const orOperands = splitByOr(node)
  return {
    node,
    operands: orOperands.map((orOperand) => {
      const andOperands = splitByAnd(orOperand)
      return {
        node: orOperand,
        operands: andOperands,
      }
    }),
  }
}
/**
 * Determines whether the two given nodes are considered to be equal. In particular, given that the nodes
 * represent expressions in a boolean context, `||` and `&&` can be considered as commutative operators.
 * @param a First node.
 * @param b Second node.
 * @returns `true` if the nodes are considered to be equal.
 */
function equal(
  a: VExpression,
  b: VExpression,
  sourceCode: SourceCode,
): boolean {
  if (a.type !== b.type) {
    return false
  }

  if (
    a.type === 'LogicalExpression'
    && b.type === 'LogicalExpression'
    && (a.operator === '||' || a.operator === '&&')
    && a.operator === b.operator
  ) {
    return (
      (equal(a.left, b.left, sourceCode) && equal(a.right, b.right, sourceCode))
      || (equal(a.left, b.right, sourceCode) && equal(a.right, b.left, sourceCode))
    )
  }

  return equalTokens(a, b, sourceCode)
}
/**
 * Determines whether the first given AndOperands is a subset of the second given AndOperands.
 *
 * e.g. A: (a && b), B: (a && b && c): B is a subset of A.
 *
 * @param operandsA The AndOperands to compare from.
 * @param operandsB The AndOperands to compare against.
 * @returns `true` if the `andOperandsA` is a subset of the `andOperandsB`.
 */
function isSubset(operandsA: AndOperands, operandsB: AndOperands, sourceCode: SourceCode): boolean {
  return operandsA.operands.every(operandA =>
    operandsB.operands.some(operandB => equal(operandA, operandB, sourceCode)),
  )
}

const RULE_NAME = 'no-dupe-else-if'

export type MessageIds =
  | typeof RULE_NAME
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      category: 'essentials',
      description: 'Disallow duplicate conditions in `v-if` / `v-else-if` chains',
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      [RULE_NAME]: 'This branch can never execute. Its condition is a duplicate or covered by previous conditions in the `v-if` / `v-else-if` chain.',
    },
  },
  defaultOptions: [],
  create(context) {
    const { sourceCode } = context

    return {
      'VAttribute[directive=true][key.name.name=\'else-if\']': (node: VDirective) => {
        if (!node.value || !node.value.expression) {
          return
        }

        const test = node.value.expression
        const conditionsToCheck
          = test.type === 'LogicalExpression' && test.operator === '&&'
            ? [...splitByAnd(test), test]
            : [test]
        const listToCheck = conditionsToCheck.map(buildOrOperands)
        let current: VElement | null = node.parent.parent

        while (current) {
          current = prevSibling(current)
          if (!current) {
            break
          }

          const vIf = getDirective(current, 'if')
          const currentTestDir = vIf || getDirective(current, 'else-if')
          if (!currentTestDir) {
            return
          }
          if (currentTestDir.value && currentTestDir.value.expression) {
            const currentOrOperands = buildOrOperands(
              currentTestDir.value.expression,
            )

            for (const condition of listToCheck) {
              const operands = (condition.operands = condition.operands.filter(
                orOperand =>
                  !currentOrOperands.operands.some(currentOrOperand =>
                    isSubset(currentOrOperand, orOperand, sourceCode),
                  ),
              ))
              if (operands.length === 0) {
                context.report({
                  node: condition.node as any,
                  messageId: RULE_NAME,
                })
                return
              }
            }
          }

          if (vIf) {
            return
          }
        }
      },
    }
  },
})
