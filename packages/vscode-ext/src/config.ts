import type { ConfigRef } from 'reactive-vscode'
import { defineConfigs } from 'reactive-vscode'

type ToConfigRefs<C extends object> = {
  [K in keyof C]: ConfigRef<C[K]>
}

export function useExtensionConfigs(): ToConfigRefs<{
  dataTrack: boolean
  hideDataTrackWarning: boolean
}> {
  const extensinoConfig = defineConfigs('vue-vine', {
    dataTrack: Boolean,
    hideDataTrackWarning: Boolean,
  })

  return extensinoConfig
}
