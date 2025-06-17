import type {
  LabsInfo,
} from '@volar/vscode'
import {
  activateAutoInsertion,
  createLabsInfo,
  getTsdk,
} from '@volar/vscode'
import * as lsp from '@volar/vscode/node'
import { useOutputChannel } from 'reactive-vscode'
import * as vscode from 'vscode'
import { Track } from './track'
import { useVineExtensionViewFeatures } from './view-features'

let client: lsp.BaseLanguageClient
let track: Track

export async function activate(context: vscode.ExtensionContext): Promise<LabsInfo> {
  const serverModule = vscode.Uri.joinPath(context.extensionUri, 'dist', 'server.js')
  const runOptions = { execArgv: <string[]>[] }
  const debugOptions = { execArgv: ['--nolazy', `--inspect=6019`] }
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
  const outputChannelName = 'Vine Language Server'
  client = new lsp.LanguageClient(
    'vine-language-server',
    outputChannelName,
    serverOptions,
    clientOptions,
  )

  const outputChannel = useOutputChannel('Vue Vine Extension')

  outputChannel.appendLine('Starting Vine Language Server ...')

  await client.start()
  outputChannel.appendLine('Vine language server started')

  // support for auto close tag
  activateAutoInsertion(['typescript'], client)

  const labsInfo = createLabsInfo()
  labsInfo.addLanguageClient(client)

  // Start track
  track = new Track({
    vscodeVersion: vscode.version,
    extensionVersion: context.extension.packageJSON.version,
    machineId: vscode.env.machineId,
    outputChannel,
  })
  await track.identify()
  await track.trackEvent('extension_activated')

  useVineExtensionViewFeatures(client, track)

  return labsInfo.extensionExports
}

// This method is called when your extension is deactivated
export const deactivate = (): Thenable<any> | undefined => client?.stop()
