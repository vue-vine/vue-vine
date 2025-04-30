import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { commitTemplateDepsUpgradeChanges } from './utils'
import { colorful } from './utils/color-str'

function run() {
  const args = process.argv.slice(2)
  const shouldCommit = args.includes('-g') || args.includes('--git')

  const vineVersion = getDepVersion('vue-vine')
  const tscVersion = getDepVersion('tsc')
  const eslintVersion = getDepVersion('eslint-config')

  try {
    upgradeDeps('vue-vine', ['common'], vineVersion)
    upgradeDeps('vue-vine-tsc', ['config', 'ts'], tscVersion)
    upgradeDeps('@vue-vine/eslint-config', ['config', 'eslint'], eslintVersion)

    if (shouldCommit) {
      commitTemplateDepsUpgradeChanges()
    }
  }
  catch (error) {
    console.error(error)
    process.exit(1)
  }
}

/**
 * @param {string[]} pkgName package path
 * @returns {string} vue-vine package version
 */
function getDepVersion(pkgName) {
  const resolvedPath = resolve(process.cwd(), 'packages', pkgName, 'package.json')

  const content = readFileSync(resolvedPath, 'utf-8')

  const { version } = JSON.parse(content)

  return version
}

/**
 * @param {string} dep `vue-vine` pkg name
 * @param {string[]} paths template path
 * @param {string} version `vue-vine` pkg version
 */
function upgradeDeps(dep, paths, version) {
  const templatePath = resolve(process.cwd(), 'packages', 'create-vue-vine', 'template', ...paths, 'package.json')

  const vueVineContent = JSON.parse(readFileSync(templatePath, 'utf-8'))

  vueVineContent.devDependencies[dep] = `^${version}`

  writeFileSync(templatePath, `${JSON.stringify(vueVineContent, null, 2)}\n`)

  console.log(
    colorful(`Upgrade ${dep} in template to ${version}`, ['green', 'bold']),
  )
}

run()
