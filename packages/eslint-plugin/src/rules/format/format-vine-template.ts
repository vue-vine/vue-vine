/* eslint-disable no-console */

import type { VTemplateRoot } from '@vue-vine/eslint-parser'
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

          const formatOptions = context.options?.[0] ?? {}
          const lineStartIndex = context.sourceCode.getIndexFromLoc({
            line: templatePositionInfo.templateStartLine,
            column: 0,
          })

          const baseIndent = (
            context.sourceCode.text
              .slice(lineStartIndex)
              .match(/^\s*/)?.[0] ?? ''
          )
          const contentIndent = baseIndent + ' '.repeat(formatOptions.indent ?? 2)
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
            formattedLines[0] = contentIndent + formattedLines[0].replace(/^<template>([\s\S]*)<\/template>$/, '$1')
            formattedLines.unshift('') // Add an empty leading line
          }
          else {
            formattedLines = formattedLines.slice(1, -2)
            formattedLines.unshift('') // Add an empty leading line
            formattedLines.push('') // Add an empty trailing line
          }

          let formatted = formattedLines
            .map((line, i) => {
              // Apply consistent base indentation to all lines
              // Skip empty lines
              if (line.trim() === '') {
                // Skip the first line
                return i === 0 ? '' : baseIndent
              }
              // Remove any existing indentation and apply base indentation
              const cleanLine = line.replace(/^\s*/, '')
              return `${contentIndent}${cleanLine}`
            })
            .join('\n')

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
