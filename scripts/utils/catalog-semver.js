import { readFileSync, writeFileSync } from 'node:fs'
import yaml from 'yaml'

export function useCatalogSemverSwitcher(
  workspaceYamlPath,
  packageJSONPath,
) {
  const workspaceYaml = yaml.parse(
    readFileSync(
      workspaceYamlPath,
      'utf-8',
    ),
  )
  const packageJSON = JSON.parse(
    readFileSync(
      packageJSONPath,
      'utf-8',
    ),
  )

  const originalSnapshot = JSON.parse(JSON.stringify(packageJSON))

  function getSemver(pkgName, catalogDef, customReplacer) {
    if (typeof catalogDef !== 'string' || !catalogDef.startsWith('catalog:')) {
      return catalogDef
    }
    if (customReplacer) {
      const hitCustom = customReplacer({
        pkgName,
        catalogDef,
        packageJSON,
      })
      if (hitCustom) {
        return hitCustom
      }
    }

    // Use the catalog name
    catalogDef = catalogDef.slice('catalog:'.length)

    const catalogCategory = workspaceYaml.catalogs[catalogDef]
    if (!catalogCategory) {
      throw new Error(`Catalog '${catalogDef}' not found`)
    }
    else if (!catalogCategory[pkgName]) {
      throw new Error(`Package '${pkgName}' not found in catalog '${catalogDef}'`)
    }

    const semver = catalogCategory[pkgName]
    return semver
  }

  function replace({
    customReplacer,
  } = {}) {
    const dependencies = packageJSON.dependencies ?? {}
    const devDependencies = packageJSON.devDependencies ?? {}

    for (const [pkgName, catalogDef] of Object.entries(dependencies)) {
      dependencies[pkgName] = getSemver(pkgName, catalogDef, customReplacer)
    }
    for (const [pkgName, catalogDef] of Object.entries(devDependencies)) {
      devDependencies[pkgName] = getSemver(pkgName, catalogDef, customReplacer)
      console.log(`[Omen DEBUG] devDependencies[${pkgName}]`, devDependencies[pkgName])
    }

    const newPackageJSON = {
      ...packageJSON,
      dependencies,
      devDependencies,
    }

    writeFileSync(
      packageJSONPath,
      `${JSON.stringify(newPackageJSON, null, 2)}\n`,
    )
  }

  function revert() {
    writeFileSync(
      packageJSONPath,
      `${JSON.stringify(originalSnapshot, null, 2)}\n`,
    )
  }

  return {
    originalSnapshot,
    replace,
    revert,
  }
}
