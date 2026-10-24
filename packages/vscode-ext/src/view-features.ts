import type * as lsp from '@volar/vscode/node'
import type { ShallowRef } from 'reactive-vscode'
import {
  nextTick,
  useCommand,
  useStatusBarItem,
  useVisibleTextEditors,
  watchEffect,
} from 'reactive-vscode'
import * as vscode from 'vscode'

export function useVineExtensionViewFeatures(
  client: lsp.BaseLanguageClient,
  outputChannelRef: ShallowRef<vscode.OutputChannel | null>,
): void {
  useCommand('vine.action.restartServer', async () => {
    await vscode.commands.executeCommand('typescript.restartTsServer')
    await client.stop()
    await client.start()

    // After restart, the output channel is re-generated,
    // so we need to update it
    outputChannelRef.value = client.outputChannel

    await nextTick()
  })

  // Register a button in the bottom of the window,
  // only show when the active file is .vine.ts
  const statusBarItem = useStatusBarItem({
    text: 'Restart Vine server',
    command: 'vine.action.restartServer',
    alignment: vscode.StatusBarAlignment.Right,
    priority: 1000,
  })

  const visibleEditor = useVisibleTextEditors()
  watchEffect(() => {
    const isStatusBarVisible = visibleEditor.value.some(
      editor => editor.document.uri.fsPath.endsWith('.vine.ts'),
    )
    if (isStatusBarVisible)
      statusBarItem.show()
    else
      statusBarItem.hide()
  })
}
