const { spawn } = require('node:child_process')
const treeKill = require('tree-kill')

const devCommand = 'cross-env NODE_ENV=development pnpm concurrently '
  + '-p "  {name}  " '
  + '-n "COMPILER,VITE,MAIN" '
  + '-c "bgGreen.bold,bgBlue.bold,bgMagenta.bold" '
  + '"rollup -w -c ./packages/compiler/rollup.config.mjs" '
  + '"sleep 6 && rollup -w -c ./packages/vite-plugin/rollup.config.mjs" '
  + '"sleep 12 && rimraf ./packages/vue-vine/dist && rollup -w -c ./packages/vue-vine/rollup.config.mjs"'

const child = spawn(devCommand, {
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
