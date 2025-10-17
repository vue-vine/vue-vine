import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { colorful } from './utils/color-str.js'
import { commitTemplateDepsUpgradeChanges } from './utils/index.js'

function run() {
  const args = process.argv.slice(2)
  const shouldCommit = args.includes('-g') || args.includes('--git')

  console.log(colorful('\n📦 Upgrading template dependencies...\n', ['cyan', 'bold']))

  const vineVersion = getDepVersion('vue-vine')
  const tscVersion = getDepVersion('tsc')
  const eslintVersion = getDepVersion('eslint-config')
  const rsbuildPluginVersion = getDepVersion('rsbuild-plugin')

  try {
    // Step 1: Upgrade internal workspace packages
    console.log(colorful('1️⃣  Upgrading internal packages...', ['blue']))
    upgradeDeps('vue-vine', ['shared', 'base'], vineVersion)
    upgradeDeps('vue-vine-tsc', ['shared', 'config', 'ts'], tscVersion)
    upgradeDeps('@vue-vine/eslint-config', ['shared', 'config', 'eslint'], eslintVersion)
    upgradeDeps('@vue-vine/rsbuild-plugin', ['rsbuild', 'base'], rsbuildPluginVersion)
    console.log()

    // Step 2: Sync external packages from e2e projects (via catalogs)
    console.log(colorful('2️⃣  Syncing external packages from catalogs...', ['blue']))
    const syncScriptPath = resolve(process.cwd(), 'scripts', 'update-template-deps-from-catalogs.js')
    if (existsSync(syncScriptPath)) {
      execSync(`node ${syncScriptPath}`, { stdio: 'inherit' })
    }
    else {
      console.log(colorful('   ⚠ update-template-deps-from-catalogs.js not found, skipping', ['yellow']))
    }

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
