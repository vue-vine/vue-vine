import type { OutputChannel } from 'vscode'
import { Umami } from '@umami/node'
import { nanoid } from 'nanoid'

export type TrackEvent
  = | 'extension_activated'
    | 'restart_server'

export class Track {
  private _vscodeVersion: string
  private _extensionVersion: string
  private _machineId: string
  private _websiteId: string
  private _hostUrl: string
  private _client: Umami
  private _sessionId: string
  private _outputChannel: OutputChannel

  constructor({
    vscodeVersion,
    extensionVersion,
    machineId,
    outputChannel,
  }: {
    vscodeVersion: string
    extensionVersion: string
    machineId: string
    outputChannel: OutputChannel
  }) {
    this._websiteId = 'dc82842c-bd27-4bdd-8305-2f5558695020'
    this._hostUrl = 'https://stats.dokduk.cc'
    this._vscodeVersion = vscodeVersion
    this._extensionVersion = extensionVersion
    this._machineId = machineId
    this._outputChannel = outputChannel
    this._sessionId = nanoid()
    this._client = new Umami({
      websiteId: this._websiteId,
      hostUrl: this._hostUrl,
      userAgent: `vscode/${this._vscodeVersion}, vue-vine/${this._extensionVersion}`,
    })

    outputChannel.appendLine(`\n[Vue Vine] track:\n${[
      `- sessionId: ${this._sessionId}`,
      `- vscodeVersion: ${this._vscodeVersion}`,
      `- extensionVersion: ${this._extensionVersion}`,
      `- machineId: ${this._machineId}`,
    ].join('\n')}`)
  }

  public async identify(): Promise<void> {
    try {
      await this._client.identify({
        sessionId: this._sessionId,
      })
      this._outputChannel.appendLine(`[Vue Vine] ${new Date().toLocaleString()} - identify success`)
    }
    catch (error) {
      this._outputChannel.appendLine(`[Vue Vine] ${new Date().toLocaleString()} - identify failed: ${error}`)
    }
  }

  public async trackEvent(
    event: TrackEvent,
    data: Record<string, string | number | Date> = {},
  ): Promise<void> {
    try {
      await this._client.track(event, {
        vscodeVersion: this._vscodeVersion,
        extensionVersion: this._extensionVersion,
        machineId: this._machineId,
        ...data,
      })
      this._outputChannel.appendLine(`[Vue Vine] ${new Date().toLocaleString()} - '${event}' event has been sent`)
    }
    catch (error) {
      this._outputChannel.appendLine(`[Vue Vine] ${new Date().toLocaleString()} - '${event}' track failed: ${error}`)
    }
  }
}
