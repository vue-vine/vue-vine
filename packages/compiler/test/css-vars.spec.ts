import { beforeEach, describe, expect, test } from 'vitest'
import hashId from 'hash-sum'
import type { VineCompilerHooks } from '../index'
import { compileVineTypeScriptFile, createCompilerCtx } from '../index'
import type { VineCompilerCtx } from '../src/types'

let mockVFC = ''
let mockCompilerHook = {} as VineCompilerHooks
let mockCompilerCtx = {} as VineCompilerCtx
beforeEach(() => {
  mockVFC = 'function testVFC() {\n'
    + '  const color = ref(\'red\')\n'
    + '\n'
    + '  vineStyle.scoped(`\n'
    + '    .blog-title {\n'
    + '      color: v-bind(color)\n'
    + '    }\n'
    + '  `)\n'
    + '  return vine`\n'
    + '     <div class="title">\n'
    + '        title\n'
    + '     </div>\n'
    + '  `\n'
    + '}'

  mockCompilerCtx = createCompilerCtx({})

  mockCompilerHook = {
    onError: () => {},
    onWarn: () => {},
    onBindFileCtx: (fileId, fileCtx) => mockCompilerCtx.fileCtxMap.set(fileId, fileCtx),
  } as VineCompilerHooks
})
describe('CSS vars injection', () => {
  test('Should be injected based on reactive variables', () => {
    const res = compileVineTypeScriptFile(mockVFC, 'mockVFC', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(`'${hashId('testVFC' + 'color')}': (color.value)`).toBeTruthy()
    expect(code).toMatchSnapshot()
  })

  test('Should be injected based on normal variables', () => {
    const mockVFCNormal = mockVFC.replace('ref(\'red\')', '\'red\'')
    const res = compileVineTypeScriptFile(mockVFCNormal, 'mockVFCNormal', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(`'${hashId('testVFC' + 'color')}': (color)`).toBeTruthy()
    expect(code).toMatchSnapshot()
  })

  test('Should be injected based on props', () => {
    const mockVFCNormal = mockVFC.replace('ref(\'red\')', 'vineProp.withDefault(\'red\')')
    const res = compileVineTypeScriptFile(mockVFCNormal, 'mockVFCNormal', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(`'${hashId('testVFC' + 'color')}': (props.color)`).toBeTruthy()
    expect(code).toMatchSnapshot()
  })

  test('Should be able to inject according to each subcomponent of vfc', () => {
    const mockVFCSub = `${mockVFC}\nfunction testVFCS() {\n`
      + '  const color = ref(\'red\')\n'
      + '\n'
      + '  vineStyle.scoped(`\n'
      + '    .blog-title {\n'
      + '      color: v-bind(color)\n'
      + '    }\n'
      + '  `)\n'
      + '  return vine`\n'
      + '     <div class="title-s">\n'
      + '        title\n'
      + '     </div>\n'
      + '  `\n'
      + '}'

    const res = compileVineTypeScriptFile(mockVFCSub, 'mockVFCNormal', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(`'${hashId('testVFC' + 'color')}': (color.value)`).toBeTruthy()
    expect(`'${hashId('testVFCS' + 'color')}': (color.value)`).toBeTruthy()
    expect(code).toMatchSnapshot()
  })

  test('Should work with w/ complex expression', () => {
    const mockComplex = 'function testVFCComplex() {\n'
      + '  let a = 100\n'
      + '  let b = 200\n'
      + '  let foo = 300\n'
      + '\n'
      + '  vineStyle.scoped(`\n'
      + '     p{\n'
      + '       width: calc(v-bind(foo) - 3px);\n'
      + '       height: calc(v-bind(\'foo\') - 3px);\n'
      + '       top: calc(v-bind(foo + \'px\') - 3px);\n'
      + '     }\n'
      + '     div {\n'
      + '       color: v-bind((a + b) / 2 + \'px\' );\n'
      + '     }\n'
      + '     div {\n'
      + '       color: v-bind    ((a + b) / 2 + \'px\' );\n'
      + '     }\n'
      + '     p {\n'
      + '       color: v-bind(((a + b)) / (2 * a));\n'
      + '     }\n'
      + '  `)\n'
      + '  return vine`\n'
      + '     <div class="title">\n'
      + '        title\n'
      + '     </div>\n'
      + '  `\n'
      + '}\n'
    const res = compileVineTypeScriptFile(mockComplex, 'testVFCComplex', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(`'${hashId('testVFCComplex' + 'a')}': (a)`).toBeTruthy()
    expect(`'${hashId('testVFCComplex' + 'b')}': (b)`).toBeTruthy()
    expect(`'${hashId('testVFCComplex' + 'c')}': (c)`).toBeTruthy()
    expect(code).toMatchSnapshot()
  })
})
