import process from 'node:process'
import { resolve } from 'node:path'
import { exec, spawn } from 'node:child_process'
import { log } from '@baiwusanyu/utils-log'
import treeKill from 'tree-kill'
import { colorful } from './color-str'

export const r = (...args) => resolve(__dirname, '..', ...args)

export async function runCommand(command, options = {}) {
  options.title && log('info', 'Executing ...', `${colorful(
    `  ${options.title}  `,
    ['black', 'bgBlue', 'bold'],
  )}  `)

  return new Promise((resolve, reject) => {
    try {
      const proc = exec(command, {
        env: {
          ...process.env,
          FORCE_COLOR: 'true',
        },
        cwd: r('../'),
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
    }
    catch (err) {
      log('error', String(err), `${colorful(
      `${options.title ? ` ${options.title} ` : ' '}`,
        ['white', 'bgRed', 'bold'],
      )}  `)
      reject(err)
    }
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
