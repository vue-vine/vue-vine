import * as path from 'node:path'
import { log } from '@baiwusanyu/utils-log'
import * as iconv from 'iconv-lite'
import shell from 'shelljs'

export function decode(data) {
  return typeof data === 'string' ? data : iconv.decode(data, 'GBK')
}
export const r = (...args) => path.resolve(__dirname, '..', ...args)

export async function runCommand(command) {
  log('info', `Command execution path -> ${r('../')}`)

  return new Promise((resolve, reject) => {
    try {
      shell.exec(command, {
        cwd: r('../'),
        stdio: 'pipe',
        shell: true,
        encoding: 'GBK',
        silent: true,
      }, (code, op, err) => {
        if (code === 0) {
          resolve(true)
        }
        if (op && op.toString()) {
          console.log(op.toString())
        }
        if (err) {
          reject(err)
        }
      })
    }
    catch (e) {
      reject(e.message)
    }
  })
}
