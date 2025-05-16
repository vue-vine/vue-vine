import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDefaultCompilerOptions } from '@vue/language-core'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { createVueVineCode } from '../src'

describe('verify Volar virtual code snapshots', () => {
  it('should match with fixture.vine.ts virtual code', () => {
    const fixturesFilePath = join(import.meta.dirname, '../../playground/src/components/fixtures.vine.ts')
    const fixturesContent = readFileSync(fixturesFilePath, 'utf-8')

    const virtualCode = createVueVineCode(
      ts,
      fixturesFilePath,
      fixturesContent,
      {},
      getDefaultCompilerOptions(),
      'extension',
    )

    expect(virtualCode.snapshot.getText(
      0,
      virtualCode.snapshot.getLength(),
    )).toMatchSnapshot()
  })
})
