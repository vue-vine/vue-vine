import { Umami } from '@umami/node'

export type TrackEvent
  = | 'extension_activated'
    | 'restart_server'
    | 'virtual_code_created'

const logFormat = new Intl.DateTimeFormat('zh-CN', {
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
export function getLogTimeLabel(): string {
  // Format: `2025-06-18 10:00:00`
  return logFormat.format(new Date())
}

export interface TrackOutputChannel {
  appendLine: (message: string) => void
}

export class Track {
  private _isDisabled: boolean = false
  private _vscodeVersion: string
  private _extensionVersion: string
  private _machineId: string
  private _websiteId: string
  private _hostUrl: string
  private _client: Umami
  private _outputChannel: TrackOutputChannel

  constructor({
    isTrackDisabled,
    vscodeVersion,
    extensionVersion,
    machineId,
    outputChannel,
  }: {
    isTrackDisabled: boolean
    vscodeVersion: string
    extensionVersion: string
    machineId: string
    outputChannel: TrackOutputChannel
  }) {
    this._websiteId = 'dc82842c-bd27-4bdd-8305-2f5558695020'
    this._hostUrl = 'https://stats.dokduk.cc'
    this._isDisabled = isTrackDisabled
    this._vscodeVersion = vscodeVersion
    this._extensionVersion = extensionVersion
    this._machineId = machineId
    this._outputChannel = outputChannel
    this._client = new Umami({
      websiteId: this._websiteId,
      hostUrl: this._hostUrl,
      sessionId: this._machineId,
    })
  }

  public async trackEvent(
    event: TrackEvent,
    data: Record<string, any> = {},
  ): Promise<void> {
    if (this._isDisabled)
      return

    try {
      await this._client.send({
        website: this._websiteId,
        url: `/${event}`,
        referrer: `https://${this._machineId}.extension-user.vue-vine.dev`,
        data: {
          vscodeVersion: this._vscodeVersion,
          extensionVersion: this._extensionVersion,
          machineId: this._machineId,
          ...data,
        },
      })
      this._outputChannel.appendLine(`${getLogTimeLabel()} - event '${event}' has been sent`)
    }
    catch (error) {
      this._outputChannel.appendLine(`${getLogTimeLabel()} - '${event}' track failed: ${error}`)
    }
  }

  public toggleDisabled(isDisabled: boolean): void {
    this._isDisabled = isDisabled
  }

  public disable(): void {
    this._isDisabled = true
  }
}
