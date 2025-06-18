import type { LabsInfo } from '@volar/vscode'
import type { Track } from '@vue-vine/language-service'
import { activateAutoInsertion, createLabsInfo, getTsdk } from '@volar/vscode'
import * as lsp from '@volar/vscode/node'
import { getLogTimeLabel } from '@vue-vine/language-service'
import * as vscode from 'vscode'
import { useExtensionConfigs } from './config'
import { useDataTrack } from './track'
import { useVineExtensionViewFeatures } from './view-features'

let client: lsp.BaseLanguageClient
let track: Track

export async function activate(context: vscode.ExtensionContext): Promise<LabsInfo> {
  const extensionConfigs = useExtensionConfigs()
  const envInfo = {
    vscodeVersion: vscode.version,
    extensionVersion: context.extension.packageJSON.version,
    machineId: vscode.env.machineId,
    isTrackDisabled: !extensionConfigs.dataTrack.value,
  }

  const serverModule = vscode.Uri.joinPath(context.extensionUri, 'dist', 'server.js')
  const runOptions: lsp.ForkOptions = {
    execArgv: [] as string[],
    env: { ...envInfo },
  }
  const debugOptions: lsp.ForkOptions = {
    execArgv: ['--nolazy', `--inspect=6019`],
    env: { ...envInfo },
  }
  const serverOptions: lsp.ServerOptions = {
    run: {
      module: serverModule.fsPath,
      transport: lsp.TransportKind.ipc,
      options: runOptions,
    },
    debug: {
      module: serverModule.fsPath,
      transport: lsp.TransportKind.ipc,
      options: debugOptions,
    },
  }
  const initializationOptions = {
    typescript: {
      tsdk: (await getTsdk(context))!.tsdk,
    },
  }
  const clientOptions: lsp.LanguageClientOptions = {
    documentSelector: [{ language: 'typescript' }],
    initializationOptions,
  }
  const outputChannelName = 'Vue Vine Extension'
  client = new lsp.LanguageClient(
    'vine-language-server',
    outputChannelName,
    serverOptions,
    clientOptions,
  )

  const outputChannel = client.outputChannel
  outputChannel.appendLine(`${getLogTimeLabel()} - Starting Vine Language Server ...`)

  await client.start()
  outputChannel.appendLine(`${getLogTimeLabel()} - Vine language server started`)

  // support for auto close tag
  activateAutoInsertion(['typescript'], client)

  const labsInfo = createLabsInfo()
  labsInfo.addLanguageClient(client)

  track = await useDataTrack(
    extensionConfigs,
    outputChannel,
    envInfo,
  )
  outputChannel.appendLine(`${getLogTimeLabel()} - Track setup:\n${[
    `  - vscodeVersion: ${envInfo.vscodeVersion}`,
    `  - extensionVersion: ${envInfo.extensionVersion}`,
    `  - machineId: ${envInfo.machineId}`,
  ].join('\n')}`)
  await track.trackEvent('extension_activated')

  useVineExtensionViewFeatures(client, track)

  return labsInfo.extensionExports
}

// This method is called when your extension is deactivated
export const deactivate = (): Thenable<any> | undefined => client?.stop()
