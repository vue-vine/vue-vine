import type * as lsp from '@volar/vscode/node'
import type { Track } from './track'
import { executeCommand, useCommand, useStatusBarItem, useVisibleTextEditors, watchEffect } from 'reactive-vscode'
import * as vscode from 'vscode'

export function useVineExtensionViewFeatures(
  client: lsp.BaseLanguageClient,
  track: Track,
): void {
  useCommand('vine.action.restartServer', async () => {
    await executeCommand('typescript.restartTsServer')
    await client.stop()
    await client.start()

    await track.trackEvent('restart_server')
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
