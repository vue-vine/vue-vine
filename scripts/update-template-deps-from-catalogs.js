import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { parse } from 'yaml'
import { colorful } from './utils/color-str.js'

/**
 * Smart template sync script
 * Syncs dependency versions from pnpm catalogs to template/
 *
 * Purpose:
 * - Keep template dependencies in sync with monorepo catalogs
 * - Automatically update external package versions when publishing
 * - Work together with upgrade-template-deps.js for internal packages
 *
 * Strategy:
 * - Scan existing dependencies in template package.json files
 * - Update their versions from pnpm catalogs (if available)
 * - Skip workspace:* packages (handled by upgrade-template-deps.js)
 */

function run() {
  console.log(colorful('\n🔄 Syncing template dependencies from catalogs...\n', ['cyan', 'bold']))

  // 1. Parse catalogs
  const catalogs = parseCatalogs()

  // 2. Update template package.json files
  updateTemplatePackagesFromCatalog(catalogs)

  console.log(colorful('✅ Template dependencies synced successfully!\n', ['green', 'bold']))
}

/**
 * Parse catalogs from pnpm-workspace.yaml
 */
function parseCatalogs() {
  const workspacePath = resolve(process.cwd(), 'pnpm-workspace.yaml')
  const content = readFileSync(workspacePath, 'utf-8')
  const workspace = parse(content)

  // Flatten all catalogs to { pkgName: version } format
  const catalogs = {}
  for (const [, packages] of Object.entries(workspace.catalogs || {})) {
    for (const [pkgName, version] of Object.entries(packages)) {
      catalogs[pkgName] = version
    }
  }

  return catalogs
}

/**
 * Update all template package.json files from catalog
 */
function updateTemplatePackagesFromCatalog(catalogs) {
  const templatePaths = [
    { path: ['shared', 'base'], label: 'Shared base' },
    { path: ['shared', 'config', 'ts'], label: 'TypeScript config' },
    { path: ['shared', 'config', 'eslint'], label: 'ESLint config' },
    { path: ['shared', 'config', 'router'], label: 'Router config' },
    { path: ['shared', 'config', 'pinia'], label: 'Pinia config' },
    { path: ['vite', 'base'], label: 'Vite base' },
    { path: ['vite', 'unocss'], label: 'Vite + UnoCSS' },
    { path: ['vite', 'tailwind'], label: 'Vite + Tailwind' },
    { path: ['rsbuild', 'base'], label: 'Rsbuild base' },
    { path: ['rsbuild', 'unocss'], label: 'Rsbuild + UnoCSS' },
    { path: ['rsbuild', 'tailwind'], label: 'Rsbuild + Tailwind' },
  ]

  for (const { path, label } of templatePaths) {
    updatePackageJsonFromCatalog(path, catalogs, label)
  }
}

/**
 * Update a template package.json file from catalog
 */
function updatePackageJsonFromCatalog(pathSegments, catalogs, label) {
  const pkgPath = resolve(
    process.cwd(),
    'packages',
    'create-vue-vine',
    'template',
    ...pathSegments,
    'package.json',
  )

  try {
    const content = readFileSync(pkgPath, 'utf-8')
    const pkg = JSON.parse(content)

    let updated = 0
    const updates = []

    // Update dependencies
    if (pkg.dependencies) {
      for (const [name, currentVersion] of Object.entries(pkg.dependencies)) {
        // Skip workspace packages (handled by upgrade-template-deps.js)
        if (currentVersion.startsWith('workspace:')) {
          continue
        }

        // Check if package is in catalog
        if (catalogs[name]) {
          const catalogVersion = catalogs[name]
          if (currentVersion !== catalogVersion) {
            pkg.dependencies[name] = catalogVersion
            updates.push(`${name}: ${currentVersion} → ${catalogVersion}`)
            updated++
          }
        }
      }
    }

    // Update devDependencies
    if (pkg.devDependencies) {
      for (const [name, currentVersion] of Object.entries(pkg.devDependencies)) {
        // Skip workspace packages (handled by upgrade-template-deps.js)
        if (currentVersion.startsWith('workspace:')) {
          continue
        }

        // Check if package is in catalog
        if (catalogs[name]) {
          const catalogVersion = catalogs[name]
          if (currentVersion !== catalogVersion) {
            pkg.devDependencies[name] = catalogVersion
            updates.push(`${name}: ${currentVersion} → ${catalogVersion}`)
            updated++
          }
        }
      }
    }

    if (updated > 0) {
      writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
      console.log(colorful(`  ✓ ${label}: ${updated} dependencies updated`, ['green']))
      for (const update of updates) {
        console.log(colorful(`    ${update}`, ['dim']))
      }
    }
    else {
      console.log(colorful(`  - ${label}: Up to date`, ['dim']))
    }
  }
  catch (err) {
    // File doesn't exist, skip silently
    if (err.code !== 'ENOENT') {
      console.log(colorful(`  ⚠ ${label}: ${err.message}`, ['yellow']))
    }
  }
}

run()
