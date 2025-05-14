import { readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

export function removeTypeScriptPluginSourcemap() {
  const typeScriptPluginDir = join(
    import.meta.dirname,
    '../packages/vscode-ext/node_modules/@vue-vine/typescript-plugin',
  )

  const sourcemapFiles = readdirSync(typeScriptPluginDir).filter(file => file.endsWith('.map'))
  for (const file of sourcemapFiles) {
    unlinkSync(join(typeScriptPluginDir, file))
  }
}
