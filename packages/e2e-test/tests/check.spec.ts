import { execSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function removeUselessPrefix(output: string) {
  return output.split('\n').map((line) => {
    const pathStartIndex = line.indexOf('/packages/e2e-test/')
    if (pathStartIndex > -1) {
      return line.slice(pathStartIndex)
    }
    return line
  }).join('\n')
}

describe('vue-vine-tsc typecheck result', () => {
  const e2eTestDir = path.resolve(import.meta.dirname, '..')

  it('should find type errors in key-cases.vine.ts', () => {
    let output = ''
    try {
      execSync('npm run check-types', {
        cwd: e2eTestDir,
        stdio: 'pipe',
        encoding: 'utf-8',
      })
    }
    catch (err: any) {
      output = err.stdout
    }
    expect(output).toMatchSnapshot()
  })

  it('should find lint errors in key-cases.vine.ts', () => {
    let output = ''
    try {
      execSync('npm run check-lint', {
        cwd: e2eTestDir,
        stdio: 'pipe',
        encoding: 'utf-8',
      })
    }
    catch (err: any) {
      output = err.stdout
    }
    expect(removeUselessPrefix(output)).toMatchSnapshot()
  })
})
