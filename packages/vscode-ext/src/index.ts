/* eslint-disable no-console */
import type {
  LabsInfo,
} from '@volar/vscode'
import {
  activateAutoInsertion,
  createLabsInfo,
  getTsdk,
} from '@volar/vscode'
import * as lsp from '@volar/vscode/node'
import * as vscode from 'vscode'
import { useVineExtensionViewFeatures } from './view-features'

let client: lsp.BaseLanguageClient

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

  console.log('Starting Vine Language Server ...')

  await client.start()
  console.log('Vine language server started')

  // support for auto close tag
  activateAutoInsertion(['typescript'], client)

  const labsInfo = createLabsInfo()
  labsInfo.addLanguageClient(client)

  useVineExtensionViewFeatures(client)

  return labsInfo.extensionExports
}

// This method is called when your extension is deactivated
export const deactivate = (): Thenable<any> | undefined => client?.stop()
