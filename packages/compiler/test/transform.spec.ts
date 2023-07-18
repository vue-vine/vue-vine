import { describe, expect, test } from 'vitest'
import type { VineCompilerHooks, VineFileCtx } from '../index'
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

function runTransform(
  content: string,
  fileName: string,
) {
  const { mockCompilerHook } = createMockTransformCtx()
  return compileVineTypeScriptFile(content, fileName, mockCompilerHook)
}

function getTransformedCode(fileCtx: VineFileCtx) {
  return fileCtx.fileSourceCode.toString()
}

describe('transform vcf containing await', () => {
  test('do not need result', () => {
    const content = 'export async function App() {\n'
      + '  const p = () => new Promise(resolve => setTimeout(resolve))\n'
      + '  await p()\n'
      + '  return vine`\n'
      + '    <div>test</div>\n'
      + '  `\n'
      + '}\n'

    const code = getTransformedCode(runTransform(content, 'testVCFAwait'))
    const matchRes = code.match(/await/g)
    expect(matchRes).toBeTruthy()
    expect(matchRes!.length).toBe(1)
    expect(code).toMatchSnapshot()
  })

  test('need result', () => {
    const content = 'export async function App() {\n'
      + '  const p = () => new Promise(resolve => setTimeout(resolve))\n'
      + '  const res = await p()\n'
      + '  return vine`\n'
      + '    <div>test</div>\n'
      + '  `\n'
      + '}\n'
    const code = getTransformedCode(runTransform(content, 'testVCFAwait'))
    const matchRes = code.match(/await/g)
    expect(matchRes).toBeTruthy()
    expect(matchRes!.length).toBe(1)
    expect(code).toMatchSnapshot()
  })
})

describe('transform vcf containing valid top level declaration', () => {
  test('should know top level declared names as LITERAL_CONST', () => {
    const content = 'const foo = \'foo\'\n'
    + 'const bar = () => \'lorem\'\n'
    + 'export function App() {\n'
    + '  console.log(foo, bar())\n'
    + '  return vine`\n'
    + '    <div>{{foo}} {{bar()}}</div>\n'
    + '  `\n'
    + '}'
    const code = getTransformedCode(runTransform(content, 'testVCFContainsTopLevelDecl'))
    expect(code).toMatchSnapshot()
  })
})

describe('transform vcf bindings ', () => {
  test('should be recongnized correctly', () => {
    const content = `
function Component() {
  const color = vineProp.withDefault('red')
  const literal = 'xyz'
  const [isOpen, toggleOpen] = useToggle()

  return vine\`
    <div>{{ color }}</div>
  \`
}`
    const fileCtx = runTransform(content, 'testTransformPlayground')
    expect(
      fileCtx.vineFnComps.map(comp => ([
        comp.fnName,
        comp.bindings,
      ])),
    ).toMatchInlineSnapshot(`
      [
        [
          "Component",
          {
            "Component": "literal-const",
            "color": "setup-ref",
            "isOpen": "setup-maybe-ref",
            "literal": "literal-const",
            "toggleOpen": "setup-maybe-ref",
          },
        ],
      ]
    `)
    expect(getTransformedCode(fileCtx)).toMatchSnapshot()
  })
})

describe('transform playground', () => {
  test('anything you want to check', () => {
    const content = `
// Write a template here
    `
    const playgroundFileId = 'testTransformPlayground'
    const fileCtx = runTransform(content, playgroundFileId)

    // Put anything you want to check below ...
    expect(fileCtx.fileId).toBe(playgroundFileId)
  })
})

describe('transform web component style', () => {
  test('use vineCE & transform style', () => {
    const content = 'export function foo() {\n'
      + '  vineStyle(`\n'
      + '    .test {\n'
      + '       color: red;\n'
      + '    }\n'
      + '  `)\n'
      + '  vineCE()\n'
      + '  return vine`\n'
      + '    <div class="test">vine</div>\n'
      + '  `\n'
      + '}'
    const code = getTransformedCode(runTransform(content, 'testVCFCEStyle'))
    expect(code.includes('__vine.styles = [__foo_styles]')).toBeTruthy()
    expect(code.includes('import __foo_styles from \'testVCFCEStyle?type=vine-style')).toBeTruthy()
    expect(code).toMatchSnapshot()
  })
})
