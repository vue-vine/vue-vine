import type { ShallowRef } from 'reactive-vscode'
import type { OutputChannel } from 'vscode'
import type { useExtensionConfigs } from './config'
import { Track } from '@vue-vine/language-service'
import { shallowRef, watch, watchEffect } from 'reactive-vscode'
import { useDataTrackWarning } from './view-features'

export function useDataTrack(
  extensionConfigs: ReturnType<typeof useExtensionConfigs>,
  outputChannelRef: ShallowRef<OutputChannel | null>,
  envInfo: {
    vscodeVersion: string
    extensionVersion: string
    machineId: string
    isTrackDisabled: boolean
  },
): ShallowRef<Track | null> {
  // Show data collection warning
  useDataTrackWarning(extensionConfigs)

  const trackRef: ShallowRef<Track | null> = shallowRef<Track | null>(null)
  watch(
    extensionConfigs.dataTrack,
    (isDisabled) => {
      trackRef.value?.toggleDisabled(isDisabled)
    },
  )
  watchEffect(() => {
    if (!outputChannelRef.value)
      return
    trackRef.value = new Track({
      outputChannel: outputChannelRef.value,
      ...envInfo,
    })
  })

  return trackRef
}
