/* eslint-disable no-console */

import type { RuleContext } from '@typescript-eslint/utils/ts-eslint'
import type { VineTemplatePositionInfo, VTemplateRoot } from '@vue-vine/eslint-parser'
import type { Options as PrettierOptions } from 'prettier'
import type { RuleModule } from '../../utils'
import { generateDifferences, showInvisibles } from 'prettier-linter-helpers'
import syncPrettier from '../../sync-prettier'
import { createEslintRule } from '../../utils'

const messageId = 'format-vine-template' as const
export type MessageIds = typeof messageId
export type Options = [{ indent: number }]

const { INSERT, DELETE, REPLACE } = generateDifferences

export const messages: Record<string, string> = {
  [INSERT]: 'Insert `{{ insertText }}`',
  [DELETE]: 'Delete `{{ deleteText }}`',
  [REPLACE]: 'Replace `{{ deleteText }}` with `{{ insertText }}`',
}

export const defaultPrettierOptions: Partial<PrettierOptions> = {
  objectWrap: 'preserve',
  experimentalOperatorPosition: 'start',
  printWidth: 100,
  semi: false,
  singleQuote: true,
}

function getPrettierFormatted(
  context: Readonly<RuleContext<string, Options>>,
  templatePositionInfo: VineTemplatePositionInfo,
  templateRawContent: string,
): string {
  const formatOptions = context.options?.[0] ?? {}
  const lineStartIndex = context.sourceCode.getIndexFromLoc({
    line: templatePositionInfo.templateStartLine,
    column: 0,
  })

  // The indent of `return ...` statement line
  const baseIndent = (
    context.sourceCode.text
      .slice(lineStartIndex)
      .match(/^\s*/)?.[0] ?? ''
  )

  // Format with Prettier
  const { template, layer } = wrapperRawTemplate(templateRawContent, baseIndent)
  const formattedRaw = syncPrettier.format(
    template,
    {
      parser: 'vue',
      filepath: context.filename,
      ...defaultPrettierOptions,
      ...formatOptions,
    },
  )

  // Remove '<template>' and '</template>' line
  let formattedLines = formattedRaw.split('\n')
  formattedLines = formattedLines.slice(layer + 1, -layer - 2)
  formattedLines.unshift('') // Add an empty leading line
  formattedLines.push(baseIndent) // Add an empty trailing line
  const formatted = formattedLines.join('\n')

  return formatted
}

function wrapperRawTemplate(rawTemplate: string, ident: string): { template: string, layer: number } {
  const TAG_NAME = 'v'.repeat(100) // a long enough tag name, must be warped
  const TAG_START = `<${TAG_NAME}>`
  const TAG_END = `</${TAG_NAME}>`

  const layer = Math.floor(ident.length / 2)
  return {
    template: `<template>${TAG_START.repeat(layer)}\n${rawTemplate}\n${TAG_END.repeat(layer)}</template>`,
    layer,
  }
}

const rule: RuleModule<Options> = createEslintRule<Options, string>({
  name: messageId,
  meta: {
    type: 'layout',
    docs: {
      category: 'format',
      description: 'Use prettier to format Vue Vine template',
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          indent: {
            type: 'number',
            minimum: 0,
            default: 2,
          },
        },
        additionalProperties: true,
      },
    ],
    messages,
  },
  defaultOptions: [{ indent: 2 }],
  create(context) {
    return {
      VTemplateRoot: async (node: VTemplateRoot) => {
        try {
          // if (!formatRunner) {
          //   formatRunner = createSyncFn(join(workerDir, 'prettier.mjs')) as any
          // }

          const { templateInfo } = node
          if (!templateInfo) {
            return
          }
          const {
            templateRawContent,
            templatePositionInfo,
          } = templateInfo

          if (templateRawContent.trim() === '') {
            // Skip formatting when given template is empty
            return
          }

          const formatted = getPrettierFormatted(
            context,
            templatePositionInfo,
            templateRawContent,
          )

          const differences = generateDifferences(
            templateRawContent,
            formatted,
          )

          for (const difference of differences) {
            const { operation, offset, deleteText = '', insertText = '' } = difference
            const range: [number, number] = [
              templatePositionInfo.templateStartOffset + offset,
              templatePositionInfo.templateStartOffset + offset + deleteText.length,
            ]
            const [start, end] = range.map(
              index => context.sourceCode.getLocFromIndex(index),
            )

            context.report({
              messageId: operation,
              data: {
                deleteText: showInvisibles(deleteText),
                insertText: showInvisibles(insertText),
              },
              loc: { start, end },
              fix: fixer => fixer.replaceTextRange(
                range,
                insertText,
              ),
            })
          }
        }
        catch (err) {
          console.log('[Vue Vine ESLint] - Formatting template failed:', err)
        }
      },
    }
  },
})

export default rule
