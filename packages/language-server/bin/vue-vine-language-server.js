#!/usr/bin/env node
if (require('node:process').argv.includes('--version')) {
  const packageJSON = require('../package.json')
  // eslint-disable-next-line no-console
  console.log(`${packageJSON.version}`)
}
else {
  require('../dist/index.js')
}
