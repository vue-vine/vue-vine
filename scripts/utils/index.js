import * as path from 'node:path'
import { exec } from 'node:child_process'
import { log } from '@baiwusanyu/utils-log'
import { colorful } from './color-str'

export const r = (...args) => path.resolve(__dirname, '..', ...args)

export async function runCommand(command, options = {}) {
  log('info', 'Executing ...', `${colorful(
    `${options.title ? ` ${options.title} ` : ' '}`,
    ['black', 'bgBlue', 'bold'],
  )} -- `)

  return new Promise((resolve, reject) => {
    try {
      const proc = exec(command, {
        cwd: r('../'),
        shell: true,
      })
      proc.stdout.on('data', (data) => {
        log('info', String(data), `${colorful(
          `${options.title ? ` ${options.title} ` : ' '}`,
          ['black', 'bgBlue', 'bold'],
        )} -- `)
      })
      proc.on('close', resolve)
      proc.on('exit', resolve)
      proc.on('error', (err) => {
        log('error', String(err), `${colorful(
          `${options.title ? ` ${options.title} ` : ' '}`,
          ['black', 'bgRed', 'bold'],
        )} -- `)
        reject(err)
      })
    }
    catch (err) {
      log('error', String(err), `${colorful(
        `${options.title ? ` ${options.title} ` : ' '}`,
        ['white', 'bgRed', 'bold'],
      )} -- `)
      reject(err)
    }
  })
}
