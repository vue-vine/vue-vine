/* eslint-disable no-console */

import type { VTemplateRoot } from '@vue-vine/eslint-parser'
import type { Options as PrettierOptions } from 'prettier'
import { join } from 'node:path'
import { generateDifferences, showInvisibles } from 'prettier-linter-helpers'
import { createSyncFn } from 'synckit'
import { createEslintRule } from '../../utils'
import { workerDir } from '../../worker-dir'

const messageId = 'format-vine-template' as const
export type MessageIds = typeof messageId
export type Options = [PrettierOptions]

const { INSERT, DELETE, REPLACE } = generateDifferences

export const messages = {
  [INSERT]: 'Insert `{{ insertText }}`',
  [DELETE]: 'Delete `{{ deleteText }}`',
  [REPLACE]: 'Replace `{{ deleteText }}` with `{{ insertText }}`',
}

let formatRunner: (code: string, options: PrettierOptions) => string

export default createEslintRule<Options, string>({
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
  defaultOptions: [{}],
  create(context) {
    return {
      VTemplateRoot: (node: VTemplateRoot) => {
        try {
          if (!formatRunner) {
            formatRunner = createSyncFn(join(workerDir, 'prettier.mjs')) as any
          }

          const { templateInfo } = node
          if (!templateInfo) {
            return
          }
          const {
            templateRawContent,
            templatePositionInfo,
          } = templateInfo

          const formatOptions = context.options?.[0] ?? {}
          const lineStartIndex = context.sourceCode.getIndexFromLoc({
            line: templatePositionInfo.templateStartLine,
            column: 0,
          })
          const baseIndent = context.sourceCode.text.slice(lineStartIndex).match(/^\s*/)?.[0] ?? ''
          const formattedLines = formatRunner(
            `<template>\n${templateRawContent}</template>`,
            {
              parser: 'vue',
              filepath: context.filename,
              ...formatOptions,
            },
          )
            .split('\n')
            .slice(1, -2) // Remove '<template>' and '</template>'

          const rawLines = templateRawContent
            .trim() // For comparing with formatted lines
            .split('\n')
          const formatted = `\n${
            formattedLines
              .map((line, i) => {
                const rawLine = rawLines[i]
                // If line's indent is not equal to rawLines[i]'s indent,
                // then we should make their indent the same.
                const rawIndent = (rawLine.match(/^\s*/)?.[0] ?? '').length
                const formattedIndent = (line.match(/^\s*/)?.[0] ?? '').length
                return `${
                  formattedIndent !== rawIndent ? baseIndent : ''
                }${line}`
              })
              .join('\n')
          }\n${baseIndent}`

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
