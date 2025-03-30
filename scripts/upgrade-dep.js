import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

function run() {
  const version = getCorePkgVersion()

  upgradeDeps('vue-vine', version)

  commitChanges()
}

/**
 * @returns {string} vue-vine package version
 */
function getCorePkgVersion() {
  const path = resolve(process.cwd(), 'packages', 'vue-vine', 'package.json')

  const content = readFileSync(path, 'utf-8')

  const { version } = JSON.parse(content)

  return version
}

/**
 * @param {string} dep `vue-vine` pkg name
 * @param {string} version `vue-vine` pkg version
 */
function upgradeDeps(dep, version) {
  const templatePath = resolve(process.cwd(), 'packages', 'create-vue-vine', 'template', 'common', 'package.json')

  const content = JSON.parse(readFileSync(templatePath, 'utf-8'))

  content.devDependencies[dep] = `^${version}`

  writeFileSync(templatePath, `${JSON.stringify(content, null, 2)}\n`)
}

function commitChanges() {
  const commitMessage = 'chore(create-vue-vine): upgrade template `vue-vine` version'

  try {
    const stageChild = spawnSync('git', ['add', 'packages/create-vue-vine/template/common/package.json'])
    const commitChild = spawnSync('git', ['commit', '-m', commitMessage])

    console.log(stageChild.stdout.toString())
    console.log(commitChild.stdout.toString())
  }
  catch (error) {
    console.error(error)
  }

  process.exit(1)
}

run()
