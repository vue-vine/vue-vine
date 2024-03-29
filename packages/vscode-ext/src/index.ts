/* eslint-disable no-console */
import type { InitializationOptions } from '@volar/language-server'
import * as serverProtocol from '@volar/language-server/protocol'
import {
  activateAutoInsertion,
  createLabsInfo,
  getTsdk,
} from '@volar/vscode'
import * as vscode from 'vscode'
import * as lsp from 'vscode-languageclient/node'

let client: lsp.BaseLanguageClient

export async function activate(context: vscode.ExtensionContext) {
  vscode.extensions.getExtension('vscode.typescript-language-features')?.activate()

  const serverModule = vscode.Uri.joinPath(context.extensionUri, 'dist', 'server.js')
  const runOptions = { execArgv: <string[]>[] }
  const debugOptions = { execArgv: ['--nolazy', `--inspect=${6009}`] }
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
  const initializationOptions: InitializationOptions = {
    // @ts-expect-error Volar 2.0 types are currently still not satisfied with the new initialization options
    typescript: {
      tsdk: (await getTsdk(context)).tsdk,
    },
  }
  const clientOptions: lsp.LanguageClientOptions = {
    documentSelector: [{ language: 'typescript' }],
    initializationOptions,
  }
  client = new lsp.LanguageClient(
    'vine-language-server',
    'Vine Language Server',
    serverOptions,
    clientOptions,
  )
  await client.start()
  console.log('Vine language server started')

  // support for auto close tag
  activateAutoInsertion(['typescript'], client)

  const labsInfo = createLabsInfo(serverProtocol)
  labsInfo.addLanguageClient(client)

  return labsInfo.extensionExports
}

// This method is called when your extension is deactivated
export const deactivate = (): Thenable<any> | undefined => client?.stop()
