#!/usr/bin/env node
if (process.argv.includes('--version')) {
  const pkgJSON = require('../package.json')
  // eslint-disable-next-line no-console
  console.log(`${pkgJSON.version}`)
}
else {
  require('../out/index.js')
}
