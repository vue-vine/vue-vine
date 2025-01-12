import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const vueVinePackageJson = require('../../vue-vine/package.json')
const templatePackageJson = require('../template/common/package.json')

const __dirname = dirname(fileURLToPath(import.meta.url))

const vueVineVersion = vueVinePackageJson.version
templatePackageJson.devDependencies['vue-vine'] = `^${vueVineVersion}`

writeFileSync(
  resolve(__dirname, '../template/common/package.json'),
  JSON.stringify(templatePackageJson, null, 2),
)

console.log(
  `\x1B[32m%s\x1B[0m`,
  `Replace vue-vine in template with "${vueVineVersion}"`,
)
