import type { InitializationOptions } from '@volar/language-server'
import * as protocol from '@volar/language-server/protocol'
import * as vscode from 'vscode'
import * as lsp from 'vscode-languageclient/node'
import type { ExportsInfoForLabs } from '@volar/vscode'
import { getTsdk, supportLabsVersion } from '@volar/vscode'

let client: lsp.BaseLanguageClient

export async function activate(context: vscode.ExtensionContext) {
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

  const disposable = vscode.commands.registerCommand(
    'vue-vine-extension.helloWorld',
    () => vscode.window.showInformationMessage('Hello World from Vue Vine syntax highlight!'),
  )
  context.subscriptions.push(disposable)

  return {
    volarLabs: {
      version: supportLabsVersion,
      languageClients: [client],
      languageServerProtocol: protocol,
    },
  } satisfies ExportsInfoForLabs
}

// This method is called when your extension is deactivated
export function deactivate() {
  return client?.stop()
}
