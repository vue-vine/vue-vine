import type * as lsp from '@volar/vscode/node'
import type { OutputChannel } from 'vscode'
import { shallowRef, type ShallowRef } from 'reactive-vscode'

export function useVineOutputChannel(
  client: lsp.BaseLanguageClient,
): ShallowRef<OutputChannel | null> {
  const outputChannelRef = shallowRef(client.outputChannel)
  return outputChannelRef
}
