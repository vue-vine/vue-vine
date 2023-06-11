import { beforeEach, describe, expect, test } from 'vitest'
import hashId from 'hash-sum'
import type { VineCompilerHooks } from '../index'
import { compileVineTypeScriptFile, createCompilerCtx } from '../index'
import type { VineCompilerCtx } from '../src/types'

let mockVCF = ''
let mockCompilerHook = {} as VineCompilerHooks
let mockCompilerCtx = {} as VineCompilerCtx
beforeEach(() => {
  mockVCF = 'function testVCF() {\n'
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
    onOptionsResolved: cb => cb(mockCompilerCtx.options),
    onError: () => {},
    onWarn: () => {},
    onBindFileCtx: (fileId, fileCtx) => mockCompilerCtx.fileCtxMap.set(fileId, fileCtx),
  } as VineCompilerHooks
})
describe('CSS vars injection', () => {
  test('Should be injected based on reactive variables', () => {
    const res = compileVineTypeScriptFile(mockVCF, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(`'${hashId('testVCF' + 'color')}': (color.value)`).toBeTruthy()
    expect(code).toMatchSnapshot()
  })

  test('Should be injected based on normal variables', () => {
    const mockVCFNormal = mockVCF.replace('ref(\'red\')', '\'red\'')
    const res = compileVineTypeScriptFile(mockVCFNormal, 'mockVCFNormal', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(`'${hashId('testVCF' + 'color')}': (color)`).toBeTruthy()
    expect(code).toMatchSnapshot()
  })

  test('Should be injected based on props', () => {
    const mockVCFNormal = mockVCF.replace('ref(\'red\')', 'vineProp.withDefault(\'red\')')
    const res = compileVineTypeScriptFile(mockVCFNormal, 'mockVCFNormal', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(`'${hashId('testVCF' + 'color')}': (props.color)`).toBeTruthy()
    expect(code).toMatchSnapshot()
  })

  test('Should be able to inject according to each subcomponent of vfc', () => {
    const mockVCFSub = `${mockVCF}\nfunction testVCFS() {\n`
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

    const res = compileVineTypeScriptFile(mockVCFSub, 'mockVCFNormal', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(`'${hashId('testVCF' + 'color')}': (color.value)`).toBeTruthy()
    expect(`'${hashId('testVCFS' + 'color')}': (color.value)`).toBeTruthy()
    expect(code).toMatchSnapshot()
  })

  test('Should work with w/ complex expression', () => {
    const mockComplex = 'function testVCFComplex() {\n'
      + '  let a = 100\n'
      + '  let b = 200\n'
      + '  let foo = 300\n'
      + '\n'
      + '  vineStyle.scoped(`\n'
      + '     p {\n'
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
    const res = compileVineTypeScriptFile(mockComplex, 'testVCFComplex', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(`'${hashId('testVCFComplex' + 'a')}': (a)`).toBeTruthy()
    expect(`'${hashId('testVCFComplex' + 'b')}': (b)`).toBeTruthy()
    expect(`'${hashId('testVCFComplex' + 'c')}': (c)`).toBeTruthy()
    expect(code).toMatchSnapshot()
  })
})
