import type { Connection } from '@volar/language-server'
import type { PipelineInstance } from './types'
import { getComponentDirectives } from './get-component-directives'
import { getComponentProps } from './get-component-props'
import { getDocumentHighlight } from './get-document-highlight'
import { getElementAttrs } from './get-element-attrs'
import { tsServerForwardingCtx } from './shared'

export function createTsServerRequestForwardingPipeline(
  connection: Connection,
): PipelineInstance {
  connection.onNotification('tsserver/response', ([id, res]) => {
    tsServerForwardingCtx.requestHandlers.get(id)?.(res)
    tsServerForwardingCtx.requestHandlers.delete(id)
  })

  return {
    getElementAttrs: getElementAttrs(connection),
    getDocumentHighlight: getDocumentHighlight(connection),
    getComponentProps: getComponentProps(connection),
    getComponentDirectives: getComponentDirectives(connection),
  }
}
