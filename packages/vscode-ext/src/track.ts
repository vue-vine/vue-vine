import type { OutputChannel } from 'vscode'
import type { useExtensionConfigs } from './config'
import { Umami } from '@umami/node'
import { watchEffect } from 'reactive-vscode'

export type TrackEvent
  = | 'extension_activated'
    | 'restart_server'

export class Track {
  private _isDisabled: boolean = false
  private _vscodeVersion: string
  private _extensionVersion: string
  private _machineId: string
  private _websiteId: string
  private _hostUrl: string
  private _client: Umami
  private _outputChannel: OutputChannel

  constructor({
    extensionConfigs,
    vscodeVersion,
    extensionVersion,
    machineId,
    outputChannel,
  }: {
    extensionConfigs: ReturnType<typeof useExtensionConfigs>
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
    this._client = new Umami({
      websiteId: this._websiteId,
      hostUrl: this._hostUrl,
      sessionId: this._machineId,
    })

    outputChannel.appendLine(`\n[Vue Vine] track:\n${[
      `- vscodeVersion: ${this._vscodeVersion}`,
      `- extensionVersion: ${this._extensionVersion}`,
      `- machineId: ${this._machineId}`,
    ].join('\n')}`)

    watchEffect(() => {
      this._isDisabled = !extensionConfigs.dataTrack.value
    })
  }

  public async trackEvent(
    event: TrackEvent,
  ): Promise<void> {
    if (this._isDisabled)
      return

    try {
      await this._client.send({
        website: this._websiteId,
        name: event,
        data: {
          vscodeVersion: this._vscodeVersion,
          extensionVersion: this._extensionVersion,
          machineId: this._machineId,
        },
      }, 'event')
      this._outputChannel.appendLine(`[Vue Vine] ${new Date().toLocaleString()} - '${event}' event has been sent`)
    }
    catch (error) {
      this._outputChannel.appendLine(`[Vue Vine] ${new Date().toLocaleString()} - '${event}' track failed: ${error}`)
    }
  }

  public disable(): void {
    this._isDisabled = true
  }
}
