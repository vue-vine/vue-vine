import { describe, expect, test } from 'vitest'
import hashId from 'hash-sum'
import type { VineCompilerHooks } from '../index'
import { compileVineStyle, compileVineTypeScriptFile, createCompilerCtx } from '../index'

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
  test('Should be injected based on reactive variables', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor.color);
    }
    `
    const content = `
    export function App(){
      const color = ref('red')
      const bgColor = reactive({ color: 'blue' })
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `

    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should be injected based on normal variables', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor.color);
    }
    `
    const content = `
    export function App(){
      const color = 'red'
      const bgColor = { color: 'blue' }
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `

    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should be injected based on props', async () => {
    const style = `
    div {
        color: v-bind(color);
    }
    `
    const content = `
    export function App(){
      const color = vineProp.withDefault('red')
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `
    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should be able to inject according to each subcomponent of vfc', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor.color);
    }
    `
    const content1 = `
    export function App(){
      const color = ref('red')
      const bgColor = reactive({ color: 'blue' })
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `
    const content2 = `
    export function App2(){
      const color = ref('pink')
      const bgColor = reactive({ color: 'green' })
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div><App></App>\`
    }
    `
    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(`${content1}\n${content2}`, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App2' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App2' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes1 } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes1).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes2 } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '488ebc72',
      },
    )
    expect(cssCompileRes2).toMatchSnapshot()
  })

  test('Should work with w/ complex expression', async () => {
    const style = `
     p{
       width: calc(v-bind(foo) - 3px);
       height: calc(v-bind('foo') - 3px);
       top: calc(v-bind(foo + 'px') - 3px);
      }
     div {
       color: v-bind((a + b) / 2 + 'px' );
     }
     div {
       color: v-bind    ((a + b) / 2 + 'px' );
     }
     p {
       color: v-bind(((a + b)) / (2 * a));
     }
    `
    const content = `
    export function App(){
      let a = 100
      let b = 200
      let foo = 300
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `
    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes('\'33d8fa9b\': (_ctx.foo)')).toBeTruthy()
    expect(code.includes('\'0763ccdc\': (_ctx.foo + \'px\')')).toBeTruthy()
    expect(code.includes('\'144bac14\': ((_ctx.a + _ctx.b) / 2 + \'px\')')).toBeTruthy()
    expect(code.includes('\'7ce50374\': (((_ctx.a + _ctx.b)) / (2 * _ctx.a))')).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should work when props are passed as parameters', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor.color);
    }
    `
    const content = `
    export function App(props: { color: string }){
      const bgColor = reactive({ color: 'blue' })
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `

    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should work when props are passed as parameters & alias', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor.color);
    }
    `
    const content = `
    export function App(alias_props: { color: string }){
      const bgColor = reactive({ color: 'blue' })
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `

    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_ctx.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_ctx.bgColor.color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should work when objects are destructured or aliased', async () => {
    const style = `
    div {
        color: v-bind(color2);
        background: v-bind(fff.color);
    }
    `
    const content = `
    export function App(){
      const a = { color: { color: 'red' } }
      const { color: { color: color2 } } = a
      const { color: fff } = a
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `

    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: false })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color2')}': (_ctx.color2)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'fff.color')}': (_ctx.fff.color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })
})

describe('CSS vars injection & inlineTemplate', () => {
  test('Should be injected based on reactive variables', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor.color);
    }
    `
    const content = `
    export function App(){
      const color = ref('red')
      const bgColor = reactive({ color: 'blue' })
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `

    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: true })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_unref(color))`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_unref(bgColor).color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should be injected based on normal variables', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor.color);
    }
    `
    const content = `
    export function App(){
      const color = 'red'
      const bgColor = { color: 'blue' }
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `

    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: true })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (bgColor.color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should be injected based on props', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor);
    }
    `
    const content = `
    export function App(){
      const color = vineProp.withDefault('red')
      const bgColor = vineProp<string>()
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `
    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: true })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (color.value)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor')}': (bgColor.value)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should be able to inject according to each subcomponent of vfc', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor.color);
    }
    `
    const content1 = `
    export function App(){
      const color = ref('red')
      const bgColor = reactive({ color: 'blue' })
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `
    const content2 = `
    export function App2(){
      const color = ref('pink')
      const bgColor = reactive({ color: 'green' })
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div><App></App>\`
    }
    `
    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: true })
    const res = compileVineTypeScriptFile(`${content1}\n${content2}`, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (_unref(color))`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_unref(bgColor).color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App2' + 'color')}': (_unref(color))`)).toBeTruthy()
    expect(code.includes(`'${hashId('App2' + 'bgColor.color')}': (_unref(bgColor).color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes1 } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes1).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes2 } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '488ebc72',
      },
    )
    expect(cssCompileRes2).toMatchSnapshot()
  })

  test('Should work with w/ complex expression', async () => {
    const style = `
     p{
       width: calc(v-bind(foo) - 3px);
       height: calc(v-bind('foo') - 3px);
       top: calc(v-bind(foo + 'px') - 3px);
      }
     div {
       color: v-bind((a + b) / 2 + 'px' );
     }
     div {
       color: v-bind    ((a + b) / 2 + 'px' );
     }
     p {
       color: v-bind(((a + b)) / (2 * a));
     }
    `
    const content = `
    export function App(){
      let a = 100
      let b = 200
      let foo = 300
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `
    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: true })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes('\'33d8fa9b\': (_unref(foo))')).toBeTruthy()
    expect(code.includes('\'0763ccdc\': (_unref(foo) + \'px\')')).toBeTruthy()
    expect(code.includes('\'144bac14\': ((_unref(a) + _unref(b)) / 2 + \'px\')')).toBeTruthy()
    expect(code.includes('\'7ce50374\': (((_unref(a) + _unref(b))) / (2 * _unref(a)))')).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should work when props are passed as parameters', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor.color);
    }
    `
    const content = `
    export function App(props: { color: string }){
      const bgColor = reactive({ color: 'blue' })
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `

    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: true })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (props.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_unref(bgColor).color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should work when props are passed as parameters & alias', async () => {
    const style = `
    div {
        color: v-bind(color);
        background: v-bind(bgColor.color);
    }
    `
    const content = `
    export function App(alias_props: { color: string }){
      const bgColor = reactive({ color: 'blue' })
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `

    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: true })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color')}': (alias_props.color)`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'bgColor.color')}': (_unref(bgColor).color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })

  test('Should work when objects are destructured or aliased', async () => {
    const style = `
    div {
        color: v-bind(color2);
        background: v-bind(fff.color);
    }
    `
    const content = `
    export function App(){
      const a = { color: { color: 'red' } }
      const { color: { color: color2 } } = a
      const { color: fff } = a
      vineStyle(\`${style}\`)
      return vine\`<div>{{color}}</div>\`
    }
    `

    const { mockCompilerHook, mockCompilerCtx } = createMockTransformCtx({ inlineTemplate: true })
    const res = compileVineTypeScriptFile(content, 'mockVCF', mockCompilerHook)
    const code = res.fileSourceCode.toString()
    expect(code.includes('useCssVars as _useCssVars')).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'color2')}': (_unref(color2))`)).toBeTruthy()
    expect(code.includes(`'${hashId('App' + 'fff.color')}': (_unref(fff).color)`)).toBeTruthy()
    expect(code).toMatchSnapshot()
    // test style compile result
    const { code: cssCompileRes } = await compileVineStyle(
      mockCompilerCtx,
      {
        vineFileId: 'mockVCF',
        source: style,
        isScoped: false,
        scopeId: '6eee8880',
      },
    )
    expect(cssCompileRes).toMatchSnapshot()
  })
})
