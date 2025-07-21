import { exec, spawn, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'
import { log } from '@baiwusanyu/utils-log'
import treeKill from 'tree-kill'
import { colorful } from './color-str'

export const r = (...args) => resolve(import.meta.dirname, '..', ...args)

export async function runCommand(command, options = {}) {
  options.title && log('info', 'Executing ...', `${colorful(
    `  ${options.title}  `,
    ['black', 'bgBlue', 'bold'],
  )}  `)

  return new Promise((resolve, reject) => {
    const proc = exec(command, {
      env: {
        ...process.env,
        FORCE_COLOR: 'true',
      },
      cwd: r('..'),
      shell: true,
    })
    proc.stdout.pipe(process.stdout)
    proc.stderr.pipe(process.stderr)

    proc.on('close', resolve)
    proc.on('exit', resolve)
    proc.on('error', (err) => {
      log('error', String(err), `${colorful(
        `${options.title ? ` ${options.title} ` : ' '}`,
        ['black', 'bgRed', 'bold'],
      )}  `)
      reject(err)
    })
    proc.on('SIGINT', () => {
      log('info', `Exit ${options.title} ...`)
    })
  })
}

export function cliExec(cmd) {
  const child = spawn(cmd, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  })

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  function exitAll(pid) {
    treeKill(pid, 'SIGINT', (err) => {
      if (err) {
        console.error('Failed to kill child process:', err)
      }
      process.exit(0)
    })
  }

  // Add listener for child process exit
  child.on('close', (code) => {
    // Restore stdin to normal mode
    process.stdin.setRawMode(false)
    process.stdin.pause()

    // Exit with the same code as child process
    process.exit(code)
  })

  child.on('error', (err) => {
    console.error('Child process error:', err)
    process.stdin.setRawMode(false)
    process.stdin.pause()
    process.exit(1)
  })

  process.stdin.on('data', (key) => {
    if (key === 'q') {
      exitAll(child.pid)
    }
    // Ctrl-C
    if (key === '\u0003') {
      exitAll(child.pid)
    }
  })
}

export function commitTemplateDepsUpgradeChanges(push = false) {
  const addResult = spawnSync('git', ['add', '.'])

  if (addResult.status !== 0) {
    throw new Error(`Git add failed: ${addResult.stderr.toString()}`)
  }

  const commitMessage = 'chore(create-vue-vine): upgrade template dep version'

  const commitResult = spawnSync('git', ['commit', '-m', commitMessage, '--no-verify'])

  if (commitResult.status !== 0) {
    throw new Error(`Git commit failed: ${commitResult.stderr.toString()}`)
  }

  log('info', 'Git commit success, ', push ? 'pushing to remote' : 'not pushing to remote')
  if (push) {
    const pushResult = spawnSync('git', ['push'])
    if (pushResult.status !== 0) {
      throw new Error(`Git push failed: ${pushResult.stderr.toString()}`)
    }
  }
  log('success', 'Template deps upgrade changes has pushed to remote.')
}
