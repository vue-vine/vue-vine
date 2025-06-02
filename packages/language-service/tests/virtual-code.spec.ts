import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDefaultCompilerOptions } from '@vue/language-core'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { createVueVineVirtualCode } from '../src'

function testSnapshotForFile(relativePath: string) {
  const filePath = join(import.meta.dirname, relativePath)
  const content = readFileSync(filePath, 'utf-8')

  const virtualCode = createVueVineVirtualCode(
    ts,
    filePath,
    content,
    {},
    getDefaultCompilerOptions(),
    'extension',
  )

  expect(virtualCode.snapshot.getText(
    0,
    virtualCode.snapshot.getLength(),
  )).toMatchSnapshot()
}

describe('verify Volar virtual code snapshots', () => {
  it('bad-cases.vine.ts', () => {
    testSnapshotForFile('../../e2e-test/src/fixtures/bad-cases.vine.ts')
  })
  it('vine-model.vine.ts', () => {
    testSnapshotForFile('../../e2e-test/src/fixtures/vine-model.vine.ts')
  })
})
