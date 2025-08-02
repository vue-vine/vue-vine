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
  // Remove '<template>' and '</template>' line
  const formattedRaw = syncPrettier.format(
    `<template>\n${templateRawContent}</template>`,
    {
      parser: 'vue',
      filepath: context.filename,
      ...defaultPrettierOptions,
      ...formatOptions,
    },
  )
  let formattedLines = formattedRaw.split('\n')
  if (formattedLines.length <= 2) {
    // Maybe case like this:
    // ```
    // 1| <template>hello</template>
    // 2|
    // ```
    // Then we should remove '<template>' and '</template>' by RegExp
    formattedLines[0] = baseIndent + formattedLines[0].replace(/^<template>([\s\S]*)<\/template>$/, '$1')
    formattedLines.unshift('') // Add an empty leading line
  }
  else {
    formattedLines = formattedLines.slice(1, -2)
    formattedLines.unshift('') // Add an empty leading line
    formattedLines.push('') // Add an empty trailing line
  }

  let isInsideComment = false
  const formatted = formattedLines
    .map((formattedLine, i) => {
      if (i === 0)
        return formattedLine
      if (i === formattedLines.length - 1)
        return `${baseIndent}${formattedLine}`

      if (
        formattedLine.includes('<!--') // Open a comment node
        && !formattedLine.includes('-->') // Doesn't end comment in the same line
      ) {
        isInsideComment = true
        return `${baseIndent}${formattedLine}` // But still apply base indent on start
      }
      else if (
        formattedLine.includes('-->') // Close a comment node
        && !formattedLine.includes('<!--') // Doesn't start a new comment in the same line
      ) {
        isInsideComment = false
        return formattedLine // Don't apply base indent on end
      }

      if (isInsideComment) {
        return formattedLine
      }
      return `${baseIndent}${formattedLine}`
    })
    .join('\n')

  return formatted
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
