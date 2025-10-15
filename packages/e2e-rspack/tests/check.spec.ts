import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

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
 * Create the error report fixture content
 */
function createErrorReportFixture(): string {
  return `import { ref } from 'vue'

// This file is used for error checking tests
// DO NOT use this file in production code
export function ErrorReportFixture() {
  const count = ref(0)

  vineStyle(\`
    .error-fixture {
      padding: 1rem;
      border: 1px solid #ccc;
    }
  \`)

  return vine\`
    <div class="error-fixture">
      <p>Test Count: {{ count }}</p>
      <button @click="count++">Add</button>
    </div>
  \`
}
`
}

const ANSI_ESCAPE = String.fromCharCode(0x1B)
const ANSI_COLOR_REGEX = new RegExp(`${ANSI_ESCAPE}\\[\\d+(?:;\\d+)*m`, 'g')

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
  let normalized = errorOutput
    // Normalize line endings (Windows \r\n to Unix \n)
    .replace(/\r\n/g, '\n')
    // Remove ANSI color/style codes (e.g., ESC[31m, ESC[0m, [37;41m, [0m, etc.)
    .replace(ANSI_COLOR_REGEX, '')
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

  // Normalize workspace paths - more aggressive approach
  // Match any absolute path that contains 'packages/' and replace everything before 'packages/'
  // This handles both Unix (/path/to/packages/) and Windows (C:/path/to/packages/)
  normalized = normalized.replace(
    /(?:[A-Za-z]:)?\/(?:[^/\s]+\/)*?(packages\/(?:e2e-rspack|rspack-loader))/g,
    '[workspace]/$1',
  )

  // Additional cleanup: remove any remaining Windows drive letters that might be left
  normalized = normalized.replace(/\b[A-Z]:\//gi, '/')

  // Remove compilation time
  normalized = normalized.replace(/compiled with \d+ errors? in [\d.]+ s/g, 'compiled with errors')

  return normalized.trim()
}

/**
 * Run rspack build and expect it to fail, returning normalized error output
 * All output is suppressed from terminal but captured for snapshot testing
 */
async function expectBuildToFail(): Promise<string> {
  try {
    const result = await execa('pnpm', ['build'], {
      cwd: e2eRoot,
      stdio: 'pipe', // Suppress all terminal output but capture it
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        CI: '1', // Disable rspack progress bars
      },
      timeout: 30000,
      reject: false, // Don't throw on non-zero exit code
    })

    // If build succeeded (exit code 0), test should fail
    if (result.exitCode === 0) {
      throw new Error('Build should have failed but succeeded')
    }

    // Combine stderr and stdout to get complete error output
    const errorOutput = result.stderr || result.stdout || ''
    return normalizeErrorOutput(errorOutput)
  }
  catch (error: any) {
    // Handle timeout or other errors
    if (error.message?.includes('timed out')) {
      throw new Error('Build process timed out')
    }
    // Re-throw unexpected errors
    throw error
  }
}

describe('rspack build error check', () => {
  const testFile = 'error-report-fixture.vine.ts'
  const testFilePath = path.resolve(srcDir, testFile)
  const mainFile = 'main.ts'
  const mainFilePath = path.resolve(srcDir, mainFile)
  let originalMainContent: string

  beforeAll(() => {
    // Clean up any leftover files from interrupted tests
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }

    // Save original main.ts
    originalMainContent = fs.readFileSync(mainFilePath, 'utf-8')

    // Create a dedicated test fixture file
    const fixtureContent = createErrorReportFixture()
    fs.writeFileSync(testFilePath, fixtureContent, 'utf-8')

    // Modify main.ts to import the test fixture so rspack will compile it
    const modifiedMain = `import { createApp } from 'vue'
import { App } from './app.vine'
// Test fixture import - will be removed after tests
import './error-report-fixture.vine'

createApp(App).mount('#app')
`
    fs.writeFileSync(mainFilePath, modifiedMain, 'utf-8')
  })

  afterEach(() => {
    // Restore test fixture to original state after each test
    const fixtureContent = createErrorReportFixture()
    fs.writeFileSync(testFilePath, fixtureContent, 'utf-8')
  })

  afterAll(() => {
    // Restore original main.ts
    fs.writeFileSync(mainFilePath, originalMainContent, 'utf-8')

    // Clean up test fixture file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }
  })

  it('should report template syntax error', async () => {
    // Introduce a template syntax error: unclosed tag
    editFile(testFile, code =>
      code.replace(
        '<div class="error-fixture">',
        '<div class="error-fixture"',
      ))

    const normalizedError = await expectBuildToFail()

    // Verify error contains all expected messages
    expect(normalizedError).toContain('ERROR in ./src/error-report-fixture.vine.ts')
    expect(normalizedError).toContain('Module Error')
    expect(normalizedError).toContain('rspack-loader')
    expect(normalizedError).toContain('Error File:')
    expect(normalizedError).toContain('error-report-fixture.vine.ts')
    expect(normalizedError).toContain('Invalid end tag')
    expect(normalizedError).toContain('Rspack compiled with errors')
  }, 45000)

  it('should report unsupported CSS language error', async () => {
    // Use an unsupported CSS language tag
    editFile(testFile, code =>
      code.replace(
        'vineStyle(',
        'vineStyle(unknown',
      ))

    const normalizedError = await expectBuildToFail()

    // Verify error contains all expected messages
    expect(normalizedError).toContain('ERROR in ./src/error-report-fixture.vine.ts')
    expect(normalizedError).toContain('Module Error')
    expect(normalizedError).toContain('rspack-loader')
    expect(normalizedError).toContain('Error File:')
    expect(normalizedError).toContain('error-report-fixture.vine.ts')
    expect(normalizedError).toContain('vineStyle CSS language only supports')
    expect(normalizedError).toContain('Rspack compiled with errors')
  }, 45000)
})
