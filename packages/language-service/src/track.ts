import { Umami } from '@umami/node'

export type TrackEvent
  = | 'restart_server'
// ... TODO: add more events

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
    this._websiteId = '4f9d14cd-73fa-46e1-8ef2-460fedb1fb0c'
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
      const payload: any = {
        website: this._websiteId,
        name: event,
        data: {
          ...data,
          machineId: this._machineId,
          vscodeVersion: this._vscodeVersion,
          extensionVersion: this._extensionVersion,
        },
      }
      const res = await this._client.send(payload)
      const respData = await res.json()
      this._outputChannel.appendLine(`${getLogTimeLabel()} - track event '${event}' response: ${JSON.stringify(respData)}`)
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
