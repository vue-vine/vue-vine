import { describe, expect, test } from 'vitest'
import hashId from 'hash-sum'
import type { VineCompilerHooks } from '../index'
import { compileVineTypeScriptFile, createCompilerCtx } from '../index'

function createMockTransformCtx(option = {}) {
  const mockCompilerCtx = createCompilerCtx(option)
  const mockCompilerHook = {
    onOptionsResolved: cb => cb(mockCompilerCtx.options),
    onError: () => {},
    onWarn: () => {},
    onBindFileCtx: (fileId, fileCtx) => mockCompilerCtx.fileCtxMap.set(fileId, fileCtx),
  } as VineCompilerHooks

  return {
    mockCompilerHook,
    mockCompilerCtx,
  }
}

describe('CSS vars injection & non inlineTemplate', () => {
  test('Should be injected based on reactive variables', () => {
    const content = 'export function App() {\n'
      + '  const color = ref(\'red\')\n'
      + '  const bgColor = reactive({ color: \'blue\' })\n'
      + '  vineStyle(`\n'
      + '    div{\n'
      + '      color: v-bind(color);\n'
      + '      background: v-bind(bgColor.color);\n'
      + '    }\n'
      + '  `)\n'
      + '  return vine`\n'
      + '    <div>{{color}}</div>\n'
      + '  `\n'
      + '}'
    const { mockCompilerHook } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
    // expect(code).toMatchSnapshot()
  })

  test('Should be injected based on normal variables', () => {
    const content = 'export function App() {\n'
      + '  const color = \'red\'\n'
      + '  const bgColor = { color: \'blue\' }\n'
      + '  vineStyle(`\n'
      + '    div{\n'
      + '      color: v-bind(color);\n'
      + '      background: v-bind(bgColor.color);\n'
      + '    }\n'
      + '  `)\n'
      + '  return vine`\n'
      + '    <div>{{color}}</div>\n'
      + '  `\n'
      + '}'
    const { mockCompilerHook } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
    // expect(code).toMatchSnapshot()
  })

  test('Should be injected based on props', () => {
    const content = 'export function App() {\n'
      + '  const color = vineProp.withDefault(\'red\')\n'
      + '  vineStyle(`\n'
      + '    div{\n'
      + '      color: v-bind(color);\n'
      + '    }\n'
      + '  `)\n'
      + '  return vine`\n'
      + '    <div>{{color}}</div>\n'
      + '  `\n'
      + '}'
    const { mockCompilerHook } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    // expect(code).toMatchSnapshot()
  })

  test('Should be able to inject according to each subcomponent of vfc', () => {
    const content1 = 'export function App() {\n'
     + '  const color = ref(\'red\')\n'
     + '  const bgColor = reactive({ color: \'blue\' })\n'
     + '  vineStyle(`\n'
     + '    div{\n'
     + '      color: v-bind(color);\n'
     + '      background: v-bind(bgColor.color);\n'
     + '    }\n'
     + '  `)\n'
     + '  return vine`\n'
     + '    <div>{{color}}</div>\n'
     + '  `\n'
     + '}'

    const content2 = 'export function App2() {\n'
      + '  const color = ref(\'red\')\n'
      + '  const bgColor = reactive({ color: \'blue\' })\n'
      + '  vineStyle(`\n'
      + '    div{\n'
      + '      color: v-bind(color);\n'
      + '      background: v-bind(bgColor.color);\n'
      + '    }\n'
      + '  `)\n'
      + '  return vine`\n'
      + '    <div>{{color}}</div>\n'
      + '  `\n'
      + '}'
    const { mockCompilerHook } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(`${content1}\n${content2}`, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App2' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App2' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
  })

  /* test('Should work with w/ complex expression', () => {
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
    expect(code.includes(`'${hashId('testVCFComplex' + 'a')}': (a)`)).toBeTruthy()
    expect(code.includes(`'${hashId('testVCFComplex' + 'b')}': (b)`)).toBeTruthy()
    expect(code.includes(`'${hashId('testVCFComplex' + 'c')}': (c)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
  })
*/
  // TODO: 驗證
  test('Should work when props are passed as parameters', () => {
    const content = 'export function App(props: { color: string }) {\n'
        + '  const bgColor = reactive({ color: \'blue\' })\n'
        + '  vineStyle(`\n'
        + '    div{\n'
        + '      color: v-bind(color);\n'
        + '      background: v-bind(bgColor.color);\n'
        + '    }\n'
        + '  `)\n'
        + '  return vine`\n'
        + '    <div>{{color}}</div>\n'
        + '  `\n'
        + '}'
    const { mockCompilerHook } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
    // expect(code).toMatchSnapshot()
  })

  // TODO: 驗證
  test('Should work when props are passed as parameters & alias', () => {
    const content = 'export function App(alias_props: { color: string }) {\n'
        + '  const bgColor = reactive({ color: \'blue\' })\n'
        + '  vineStyle(`\n'
        + '    div{\n'
        + '      color: v-bind(color);\n'
        + '      background: v-bind(bgColor.color);\n'
        + '    }\n'
        + '  `)\n'
        + '  return vine`\n'
        + '    <div>{{color}}</div>\n'
        + '  `\n'
        + '}'
    const { mockCompilerHook } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
  })

  test('Should work when objects are destructured or aliased', () => {
    const content = 'export function App() {\n'
      + '  const a = { color: { color: \'red\' } }\n'
      + '  const { color: { color: color2 } } = a\n'
      + '  const { color: fff } = a\n'
      + '  vineStyle(`\n'
      + '    div{\n'
      + '      color: v-bind(color2);\n'
      + '      background: v-bind(fff.color);\n'
      + '    }\n'
      + '  `)\n'
      + '  return vine`\n'
      + '    <div>{{color}}</div>\n'
      + '  `\n'
      + '}'
    const { mockCompilerHook } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color2')}': (_ctx.color2)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'fff.color')}': (_ctx.fff.color)`)).toBeTruthy()
  })

  // TODO: props 优先级更低。。但是這是由 vue 決定的，我們只要匹配其中之一，放到 useCssVars 即可
  // TODO: 测试样式
})
