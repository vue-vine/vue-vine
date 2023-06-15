/**
 * Implementation from vue
 * https://github.com/vuejs/core/blob/main/packages/compiler-sfc/src/style/cssVars.ts
 */
const enum LexerState {
  inParens,
  inSingleQuoteString,
  inDoubleQuoteString,
}

function lexBinding(content: string, start: number): number | null {
  let state: LexerState = LexerState.inParens
  let parenDepth = 0

  for (let i = start; i < content.length; i++) {
    const char = content.charAt(i)
    switch (state) {
      case LexerState.inParens:
        if (char === '\'') {
          state = LexerState.inSingleQuoteString
        }
        else if (char === '"') {
          state = LexerState.inDoubleQuoteString
        }
        else if (char === '(') {
          parenDepth++
        }
        else if (char === ')') {
          if (parenDepth > 0) {
            parenDepth--
          }
          else {
            return i
          }
        }
        break
      case LexerState.inSingleQuoteString:
        if (char === '\'') {
          state = LexerState.inParens
        }
        break
      case LexerState.inDoubleQuoteString:
        if (char === '"') {
          state = LexerState.inParens
        }
        break
    }
  }
  return null
}

function normalizeExpression(exp: string) {
  exp = exp.trim()
  if (
    (exp[0] === '\'' && exp[exp.length - 1] === '\'')
    || (exp[0] === '"' && exp[exp.length - 1] === '"')
  ) {
    return exp.slice(1, -1)
  }
  return exp
}

const vBindRE = /v-bind\s*\(/g

export function parseCssVars(
  styles: string[],
  hook?: {
    getIndex(start: number, end: number): void
  },
): string[] {
  const vars: string[] = []
  styles.forEach((style) => {
    let match: RegExpExecArray | null = null
    // ignore v-bind() in comments /* ... */
    const content = style.replace(/\/\*([\s\S]*?)\*\//g, '')
    // eslint-disable-next-line no-cond-assign
    while ((match = vBindRE.exec(content))) {
      const start = match.index + match[0].length
      const end = lexBinding(content, start)
      if (end !== null) {
        hook && hook.getIndex(start, end)
        const variable = normalizeExpression(content.slice(start, end))
        if (!vars.includes(variable)) {
          vars.push(variable)
        }
      }
    }
  })
  return vars
}
