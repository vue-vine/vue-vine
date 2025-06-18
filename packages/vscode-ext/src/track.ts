import type { OutputChannel } from 'vscode'
import type { useExtensionConfigs } from './config'
import { Track } from '@vue-vine/language-service'
import { watch } from 'reactive-vscode'
import { useDataTrackWarning } from './view-features'

export async function useDataTrack(
  extensionConfigs: ReturnType<typeof useExtensionConfigs>,
  outputChannel: OutputChannel,
  envInfo: {
    vscodeVersion: string
    extensionVersion: string
    machineId: string
    isTrackDisabled: boolean
  },
): Promise<Track> {
  useDataTrackWarning(extensionConfigs)
  const track = new Track({
    outputChannel,
    ...envInfo,
  })
  watch(
    extensionConfigs.dataTrack,
    (isDisabled) => {
      track.toggleDisabled(isDisabled)
    },
  )

  return track
}
