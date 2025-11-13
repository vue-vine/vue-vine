import process from 'node:process'
import { version } from '../package.json'
import { startServer } from './server'

if (process.argv.includes('--version')) {
  console.log(version)
}
else {
  startServer()
}
