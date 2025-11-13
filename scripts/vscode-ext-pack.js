import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'
import semver from 'semver'
import { removeTypeScriptPluginSourcemap } from './remove-sourcemap.js'
import { useCatalogSemverSwitcher } from './utils/catalog-semver.js'
import { colorful } from './utils/color-str.js'

const workspaceYamlPath = resolve(
  import.meta.dirname,
  '../pnpm-workspace.yaml',
)
const vscodeExtPackageJSONPath = resolve(
  import.meta.dirname,
  '../packages/vscode-ext/package.json',
)

async function runSpawnSync(cmd, args) {
  await spawnSync(cmd, args, {
    stdio: 'inherit',
  })
}

const { replace, revert } = useCatalogSemverSwitcher(
  workspaceYamlPath,
  vscodeExtPackageJSONPath,
)

async function publish() {
  console.log(
    colorful(
      '[Vue Vine VSCode Ext Publish] VSCode extension package.json catalogs has been replaced with semver.',
      ['green', 'bold'],
    ),
  )

  try {
    await runSpawnSync('pnpm', ['--filter', 'vue-vine-extension', 'run', 'publish:ext'])
    await runSpawnSync('pnpm', ['--filter', 'vue-vine-extension', 'run', 'publish:osvx'])
  }
  catch (err) {
    console.log(
      colorful(
        '[Vue Vine VSCode Ext Publish] Extension publish failed.',
        ['red', 'bold'],
      ),
    )
    console.error(err)
  }
}

async function pack() {
  await runSpawnSync('pnpm', ['--filter', 'vue-vine-extension', 'run', 'pack:ext'])
  console.log(
    colorful(
      '[Vue Vine VSCode Ext Pack] Extension pack has been created.',
      ['green', 'bold'],
    ),
  )
}

async function run() {
  const isBumpPack = process.argv.includes('--bump')
  const isBumpMinor = process.argv.includes('--minor')
  const isBumpMajor = process.argv.includes('--major')

  const replaceOptions = {
    depVersionReplacer: ({ pkgName, packageJSON }) => {
      if (pkgName === '@types/vscode') {
        return packageJSON.engines.vscode
      }
    },
  }

  const bumpType = (
    isBumpPack
      ? 'patch'
      : isBumpMinor
        ? 'minor'
        : isBumpMajor
          ? 'major'
          : null
  )
  if (bumpType) {
    replaceOptions.pkgVersionReplacer = ({ packageJSON }) => {
      return semver.inc(packageJSON.version, bumpType)
    }
  }

  replace(replaceOptions)

  const args = process.argv.slice(2)
  if (args.includes('publish')) {
    await publish()
  }
  else if (args.includes('pack')) {
    await pack()
  }

  revert()
  console.log(
    colorful(
      '[Vue Vine VSCode Ext Publish] VSCode extension package.json catalogs has been reverted.',
      ['green', 'bold'],
    ),
  )
}

// Must remove sourcemap before pack
removeTypeScriptPluginSourcemap()

run()
