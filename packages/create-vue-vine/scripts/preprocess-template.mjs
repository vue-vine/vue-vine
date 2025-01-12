import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const _require = createRequire(import.meta.url)
const vueVinePackageJson = _require('../../vue-vine/package.json')

const templateCommonPackageJson = _require('../template/common/package.json')

const __dirname = dirname(fileURLToPath(import.meta.url))

// main package
const vueVineVersion = vueVinePackageJson.version
const mainPkgReplacement = `^${vueVineVersion}`
templateCommonPackageJson.devDependencies['vue-vine'] = mainPkgReplacement
writeFileSync(
  resolve(__dirname, '../template/common/package.json'),
  `${JSON.stringify(templateCommonPackageJson, null, 2)}\n`,
)
console.log(
  `\x1B[32m%s\x1B[0m`,
  `Replace vue-vine in template with "${mainPkgReplacement}"`,
)

// tsc
const templateConfigPackageJson = _require('../template/config/ts/package.json')
const vineTscPackageJson = _require('../../tsc/package.json')
const vineTscVersion = vineTscPackageJson.version
const tscPkgReplacement = `^${vineTscVersion}`
templateConfigPackageJson.devDependencies['vue-vine-tsc'] = tscPkgReplacement
writeFileSync(
  resolve(__dirname, '../template/config/ts/package.json'),
  `${JSON.stringify(templateConfigPackageJson, null, 2)}\n`,
)
console.log(
  `\x1B[32m%s\x1B[0m`,
  `Replace vue-vine-tsc in template with "${tscPkgReplacement}"`,
)

// eslint
const templateConfigEslintPackageJson = _require('../template/config/eslint/package.json')
const vineEslintPackageJson = _require('../../eslint-config/package.json')
const vineEslintVersion = vineEslintPackageJson.version
const eslintPkgReplacement = `^${vineEslintVersion}`
templateConfigEslintPackageJson.devDependencies['@vue-vine/eslint-config'] = eslintPkgReplacement
writeFileSync(
  resolve(__dirname, '../template/config/eslint/package.json'),
  `${JSON.stringify(templateConfigEslintPackageJson, null, 2)}\n`,
)
console.log(
  `\x1B[32m%s\x1B[0m`,
  `Replace @vue-vine/eslint-config in template with "${eslintPkgReplacement}"`,
)
