import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
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

const { replace, revert } = useCatalogSemverSwitcher(
  workspaceYamlPath,
  vscodeExtPackageJSONPath,
)

async function publish() {
  replace({
    customReplacer: ({ pkgName, packageJSON }) => {
      if (pkgName === '@types/vscode') {
        return packageJSON.engines.vscode
      }

      return null
    },
  })
  console.log(
    colorful(
      '[Vue Vine VSCode Ext Publish] VSCode extension package.json catalogs has been replaced with semver.',
      ['green', 'bold'],
    ),
  )

  try {
    /** @type {import('node:child_process').SpawnSyncOptions} */
    const spawnSyncOptions = {
      stdio: 'inherit',
    }
    await spawnSync('pnpm', ['--filter', 'vue-vine-extension', 'run', 'publish:ext'], spawnSyncOptions)
    await spawnSync('pnpm', ['--filter', 'vue-vine-extension', 'run', 'publish:osvx'], spawnSyncOptions)
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

  revert()
  console.log(
    colorful(
      '[Vue Vine VSCode Ext Publish] VSCode extension package.json catalogs has been reverted.',
      ['green', 'bold'],
    ),
  )
}

publish()
