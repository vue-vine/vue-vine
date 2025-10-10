import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { getDefaultVueCompilerOptions } from '../../language-server/src/utils'
import { createVueVineVirtualCode } from '../src'

function testSnapshotForFile(relativePath: string) {
  const filePath = join(import.meta.dirname, relativePath)
  const content = readFileSync(filePath, 'utf-8')

  const virtualCode = createVueVineVirtualCode(
    ts,
    filePath,
    content,
    {},
    getDefaultVueCompilerOptions(ts.sys),
    'extension',
  )

  expect(virtualCode.snapshot.getText(
    0,
    virtualCode.snapshot.getLength(),
  )).toMatchSnapshot()
}

describe('verify Volar virtual code snapshots', () => {
  it('key-cases.vine.ts', () => {
    testSnapshotForFile('../../e2e-test/src/fixtures/key-cases.vine.ts')
  })
  it('vine-model.vine.ts', () => {
    testSnapshotForFile('../../e2e-test/src/fixtures/vine-model.vine.ts')
  })
  it('use-template-ref-virtual-code.vine.ts', () => {
    testSnapshotForFile('../../e2e-test/src/fixtures/use-template-ref-virtual-code.vine.ts')
  })
  it('custom-elements.vine.ts', () => {
    testSnapshotForFile('../../e2e-test/src/fixtures/custom-elements.vine.ts')
  })
})
