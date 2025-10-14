import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { afterEach, describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, '../src')
const e2eRoot = path.resolve(__dirname, '..')

/**
 * Edit a file in the src directory
 */
function editFile(filename: string, replacer: (code: string) => string): void {
  const filePath = path.resolve(srcDir, filename)
  const content = fs.readFileSync(filePath, 'utf-8')
  const modified = replacer(content)
  fs.writeFileSync(filePath, modified, 'utf-8')
}

/**
 * Restore a file to its original state
 */
function restoreFile(filename: string, originalContent: string): void {
  const filePath = path.resolve(srcDir, filename)
  fs.writeFileSync(filePath, originalContent, 'utf-8')
}

/**
 * Normalize error output for stable snapshots across platforms
 * - Remove ANSI color codes
 * - Remove special Unicode characters
 * - Normalize file paths (cross-platform)
 * - Remove line/column numbers
 * - Remove compilation time
 * - Normalize line endings
 */
function normalizeErrorOutput(errorOutput: string): string {
  return errorOutput
    // Normalize line endings (Windows \r\n to Unix \n)
    .replace(/\r\n/g, '\n')
    // Remove ANSI color/style codes (e.g., ESC[31m, ESC[0m, [37;41m, [0m, etc.)
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B\[\d+(?:;\d+)*m/g, '')
    .replace(/\[\d+(?:;\d+)*m/g, '')
    // Remove special Unicode whitespace characters (e.g., \u2009 thin space, \u00A0 non-breaking space)
    .replace(/[\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Normalize multiple spaces to single space
    .replace(/ {2,}/g, ' ')
    // Normalize path separators first (Windows backslash to forward slash)
    .replace(/\\/g, '/')
    // Remove file location details
    .replace(/at .+?:\d+:\d+/g, 'at [location]')
    .replace(/\(.+?:\d+:\d+\)/g, '([location])')
    .replace(/file:\/\/\/.+/g, 'file://[path]')
    // Normalize workspace paths - match absolute paths before 'packages/'
    // Unix-style: /any/path/to/project/packages/
    .replace(/\/[\w\-./]+?\/packages\//g, '[workspace]/packages/')
    // Windows-style: C:/any/path/to/project/packages/
    .replace(/[A-Za-z]:\/[\w\-./]+?\/packages\//g, '[workspace]/packages/')
    // Remove compilation time
    .replace(/compiled with \d+ errors? in [\d.]+ s/g, 'compiled with errors')
    .trim()
}

/**
 * Run rspack build and expect it to fail, returning normalized error output
 */
async function expectBuildToFail(errorMessage: string): Promise<string> {
  try {
    await execa('pnpm', ['build'], {
      cwd: e2eRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
    })
    // If build succeeds, the test should fail
    expect.fail(errorMessage)
  }
  catch (error: any) {
    // Extract and normalize error message from stderr or stdout
    const errorOutput = error.stderr || error.stdout || error.message
    return normalizeErrorOutput(errorOutput)
  }
}

describe('rspack build error check', () => {
  const testFile = 'app.vine.ts'
  let originalContent: string

  // Save original content before tests
  const filePath = path.resolve(srcDir, testFile)
  originalContent = fs.readFileSync(filePath, 'utf-8')

  afterEach(() => {
    // Restore file to original state after each test
    restoreFile(testFile, originalContent)
  })

  it('should report template syntax error', async () => {
    // Introduce a template syntax error: unclosed tag
    editFile(testFile, code =>
      code.replace(
        '<div class="counter">',
        '<div class="counter"',
      ))

    const normalizedError = await expectBuildToFail('Build should have failed with template syntax error')

    expect(normalizedError).toMatchSnapshot()
  })

  it('should report invalid macro usage error', async () => {
    // Introduce an invalid macro usage: vineProps in wrong location
    editFile(testFile, code =>
      code.replace(
        'export function Counter() {',
        'export function Counter() {\n  vineProps()',
      ))

    const normalizedError = await expectBuildToFail('Build should have failed with invalid macro usage error')

    expect(normalizedError).toMatchSnapshot()
  })

  it('should report unsupported CSS language error', async () => {
    // Use an unsupported CSS language tag
    editFile(testFile, code =>
      code.replace(
        'vineStyle(',
        'vineStyle(typescript',
      ))

    const normalizedError = await expectBuildToFail('Build should have failed with unsupported CSS language error')

    expect(normalizedError).toMatchSnapshot()
  })
})
