import * as path from 'node:path'
import { exec, spawn } from 'node:child_process'
import { log } from '@baiwusanyu/utils-log'
import { colorful } from './color-str'

export const r = (...args) => path.resolve(__dirname, '..', ...args)

export async function runCommand(command, options = {}) {
  options.title && log('info', 'Executing ...', `${colorful(
    options.title,
    ['black', 'bgBlue', 'bold'],
  )}  `)

  return new Promise((resolve, reject) => {
    try {
      const proc = exec(command, {
        cwd: r('../'),
        shell: true,
      })
      proc.stdout.on('data', (data) => {
        console.log(String(data).trim())
      })
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

export async function spawnCommand(command, args = [], options = {}) {
  options.title && log('info', '(spawn) Executing ...', `${colorful(
  `${options.title ? ` ${options.title} ` : ' '}`,
    ['black', 'bgBlue', 'bold'],
  )}  `)

  return new Promise((resolve, reject) => {
    try {
      const proc = spawn(command, args, {
        cwd: r('../'),
        shell: true,
        stdio: 'inherit',
      })
      proc.on('close', resolve)
      proc.on('exit', resolve)
      proc.on('error', (err) => {
        log('error', String(err), `${colorful(
        `${options.title ? ` ${options.title} ` : ' '}`,
          ['black', 'bgRed', 'bold'],
        )}  `)
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
