import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDefaultCompilerOptions } from '@vue/language-core'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { createVueVineVirtualCode } from '../src'

describe('verify Volar virtual code snapshots', () => {
  it('should match with fixture.vine.ts virtual code', () => {
    const fixturesFilePath = join(import.meta.dirname, '../../playground/src/components/fixtures.vine.ts')
    const fixturesContent = readFileSync(fixturesFilePath, 'utf-8')

    const virtualCode = createVueVineVirtualCode(
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

  it('should match with about.vine.ts virtual code', () => {
    const aboutFilePath = join(import.meta.dirname, '../../playground/src/pages/about.vine.ts')
    const aboutContent = readFileSync(aboutFilePath, 'utf-8')

    const virtualCode = createVueVineVirtualCode(
      ts,
      aboutFilePath,
      aboutContent,
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
