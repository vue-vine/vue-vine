import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

function run() {
  const vineVersion = getDepVersion('vue-vine')
  const tscVersion = getDepVersion('tsc')

  try {
    upgradeDeps('vue-vine', ['common'], vineVersion)
    upgradeDeps('vue-vine-tsc', ['config', 'ts'], tscVersion)

    commitChanges()
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
}

function commitChanges() {
  const addResult = spawnSync('git', ['add', '.'])

  if (addResult.status !== 0) {
    throw new Error(`Git add failed: ${addResult.stderr.toString()}`)
  }

  const commitMessage = 'chore(create-vue-vine): upgrade template dep version'

  const commitResult = spawnSync('git', ['commit', '-m', commitMessage])

  if (commitResult.status !== 0) {
    throw new Error(`Git commit failed: ${commitResult.stderr.toString()}`)
  }
}

run()
