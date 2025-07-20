import type * as lsp from '@volar/vscode/node'
import type { ShallowRef } from 'reactive-vscode'
import type { useExtensionConfigs } from './config'
import {
  executeCommand,
  nextTick,
  useCommand,
  useStatusBarItem,
  useVisibleTextEditors,
  watchEffect,
} from 'reactive-vscode'
import * as vscode from 'vscode'

export async function useDataTrackWarning(
  extensionConfigs: ReturnType<typeof useExtensionConfigs>,
): Promise<void> {
  const isNeedHideWarning = extensionConfigs.hideDataTrackWarning.value
  if (isNeedHideWarning)
    return

  const result = await vscode.window.showWarningMessage(
    'Vue Vine will collect event data such as extension activating, language server restarting, etc. You can choose to turn off it.',
    ...[
      'Why?',
      'Turn off',
      'Don\'t show again',
    ],
  )
  switch (result) {
    case 'Why?':
      await executeCommand('vscode.open', vscode.Uri.parse('https://github.com/vue-vine/vue-vine/pull/283'))
      break
    case 'Turn off':
      extensionConfigs.dataTrack.value = false
      break
    case 'Don\'t show again':
      extensionConfigs.hideDataTrackWarning.value = true
      break
  }
}

export function useVineExtensionViewFeatures(
  client: lsp.BaseLanguageClient,
  outputChannelRef: ShallowRef<vscode.OutputChannel | null>,
): void {
  useCommand('vine.action.restartServer', async () => {
    await executeCommand('typescript.restartTsServer')
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
