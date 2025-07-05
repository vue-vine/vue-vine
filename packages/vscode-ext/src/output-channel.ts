import type * as lsp from '@volar/vscode/node'
import type { ShallowRef } from 'reactive-vscode'
import type { OutputChannel } from 'vscode'
import { shallowRef } from 'reactive-vscode'

export function useVineOutputChannel(
  client: lsp.BaseLanguageClient,
): ShallowRef<OutputChannel | null> {
  const outputChannelRef = shallowRef(client.outputChannel)
  return outputChannelRef
}
