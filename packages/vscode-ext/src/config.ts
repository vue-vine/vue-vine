import { defineConfig } from 'reactive-vscode'

interface ExtensionConfig {
  dataTrack: boolean
  hideDataTrackWarning: boolean
}

export function useExtensionConfigs(): ExtensionConfig {
  return defineConfig<ExtensionConfig>('vue-vine')
}
