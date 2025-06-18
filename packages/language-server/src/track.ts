import type { TrackOutputChannel } from '@vue-vine/language-service'
import { env } from 'node:process'
import { Track } from '@vue-vine/language-service'

const {
  vscodeVersion = 'unknown',
  extensionVersion = 'unknown',
  machineId = 'unknown',
  isTrackDisabled = 'false',
} = env

const outputChannel: TrackOutputChannel = {
  appendLine: (message) => {
    console.log(message)
  },
}

export const track: Track = new Track({
  isTrackDisabled: isTrackDisabled === 'true',
  vscodeVersion,
  extensionVersion,
  machineId,
  outputChannel,
})
