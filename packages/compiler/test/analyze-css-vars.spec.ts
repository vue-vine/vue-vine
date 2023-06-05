import { describe, expect, test } from 'vitest'
import { parseCssVars } from '../src/analyze-css-vars'

describe('analyze css vbind', () => {
  test('Should be able to parse to extract the v-bind value', () => {
    const source = `
    .test {
      color: v-bind(color);
    }
  `
    const expected = ['color']
    expect(parseCssVars([source])).toMatchObject(expected)
  })

  test('Should be able to parse single quoted values', () => {
    const source = `
    .test {
      color: v-bind('color');
    }
  `
    const expected = ['color']
    expect(parseCssVars([source])).toMatchObject(expected)
  })

  test('Should be able to parse double quoted values', () => {
    const source = `
    .test {
      color: v-bind("color");
    }
  `
    const expected = ['color']
    expect(parseCssVars([source])).toMatchObject(expected)
  })

  test('Should be able to parse the value of the template string', () => {
    const source = `
    .test {
      color: v-bind(\`\${v}\`\);
      background-image: v-bind('\`url('\${bgUrl}'\)\`');
    }
  `
    // eslint-disable-next-line no-template-curly-in-string
    const expected = ['`${v}`', '`url(\'${bgUrl}\')`']
    expect(parseCssVars([source])).toMatchObject(expected)
  })

  test('Should be able to parse extract v-bind values in nested', () => {
    const source = `
    .parent {
      .child {
        color: v-bind(color);
      }
    }
  `
    const expected = ['color']
    expect(parseCssVars([source])).toMatchObject(expected)
  })

  test('Should be able to parse extract v-bind values when ignoring single line comments', () => {
    const source = `
    .test {
      color: v-bind(color); // this is a comment
    }
  `
    const expected = ['color']
    expect(parseCssVars([source])).toMatchObject(expected)
  })

  test('Should be able to parse extract v-bind values when ignoring multi-line comments', () => {
    const source = `
    .test {
      color: v-bind(color); /* this is a
      multi-line
      comment */
    }
  `
    const expected = ['color']
    expect(parseCssVars([source])).toMatchObject(expected)
  })

  test('Should be able to extract multiple v-bind values in analysis', () => {
    const source = `
    .test {
      color: v-bind(color1);
      background-color: v-bind(color2);
    }
  `
    const expected = ['color1', 'color2']
    expect(parseCssVars([source])).toMatchObject(expected)
  })

  test('Should only analyze to extract unique values', () => {
    const source = `
    .test {
      color: v-bind(color1);
      background-color: v-bind(color1);
    }
  `
    const expected = ['color1']
    expect(parseCssVars([source])).toMatchObject(expected)
  })

  test('Should be able to parse to extract values inside nested parentheses', () => {
    const source = `
    .test {
      color: v-bind(((color1)));
    }
  `
    const expected = ['((color1))']
    expect(parseCssVars([source])).toMatchObject(expected)
  })

  test('the right parenthesis is missing', () => {
    const source = `
    .test {
      v-bind(color1;
    }
  `
    expect(parseCssVars([source])).toMatchObject([])
  })

  test('the left parenthesis is missing', () => {
    const source = `
    .test {
      v-bind color1);
    }
  `
    expect(parseCssVars([source])).toMatchObject([])
  })

  test('should be able to parse incomplete expressions', () => {
    const source = `
    .test {
       font-weight: v-bind("count.toString(");
       font-weight: v-bind(xxx);
    }
  `
    expect(parseCssVars([source])).toMatchObject(['count.toString(', 'xxx'])
  })
})
