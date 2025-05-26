import type { PipelineRequest, PipelineResponseInstance, VueVineVirtualCode } from '@vue-vine/language-service'
import type * as ts from 'typescript'
import type { HtmlTagInfo } from '../types'
import { randomUUID } from 'node:crypto'
import { tryParsePipelineResponse } from '@vue-vine/language-service'
import { WebSocket } from 'ws'
import { getPipelineServerPort } from './get-pipeline-server-port'

type RequestNameToResponseName<T extends PipelineRequest['type']> = T extends `${infer R}Request` ? `${R}Response` : never

function getResponseName<N extends PipelineRequest['type']>(requestName: N) {
  return requestName.replace('Request', 'Response') as RequestNameToResponseName<N>
}

export interface PipelineClientContext {
  vineVirtualCode: VueVineVirtualCode
  tagInfos: Map<string, HtmlTagInfo>
  pendingRequests: Map<string, Promise<void>>
  tsConfigFileName: string
  tsHost: ts.System
}
export interface PipelineClientInstance {
  debounceCache: Set<PipelineRequest['type']>
}

const REQUEST_TIMEOUT = 10000
const pipelineClient: PipelineClientInstance = {
  debounceCache: new Set(),
}

export function handlePipelineResponse<Req extends PipelineRequest['type']>(
  context: PipelineClientContext,
  params: {
    requestName: Req
    onSend: (ws: WebSocket, requestId: string) => void
    onMessageData: (response: PipelineResponseInstance<RequestNameToResponseName<Req>>) => void
  },
): Promise<void> {
  const { tsConfigFileName, tsHost, pendingRequests } = context
  const { requestName, onSend, onMessageData } = params

  const port = getPipelineServerPort(tsConfigFileName, tsHost)
  const pipelineWebSocket = new WebSocket(`ws://localhost:${port}`)

  const requestId = randomUUID()
  const requestPromise = new Promise<void>((resolve, reject) => {
    // set request timeout
    const timeout = setTimeout(() => {
      reject(new Error(`Pipeline request timeout`))
      pendingRequests.delete(requestId)
      pipelineWebSocket.close()
    }, REQUEST_TIMEOUT)

    pipelineWebSocket.on('open', () => {
      if (pipelineClient.debounceCache.has(requestName)) {
        // Skip request if it's already in cache
        return
      }

      onSend(pipelineWebSocket, requestId)
      pipelineClient.debounceCache.add(requestName)
    })

    pipelineWebSocket.on('message', (msgData) => {
      const resp = tryParsePipelineResponse(msgData.toString(), (err) => {
        reject(err)
      })
      if (!resp) {
        const err = new Error(
          '[Vue Vine Pipeline] Invalid pipeline response data',
          { cause: msgData.toString() },
        )
        reject(err)
        return
      }

      console.log(`Pipeline: Got message for ${resp.type}`)

      // ensure this response is for our request
      if (
        resp.type === getResponseName(requestName)
        && resp.requestId === requestId
      ) {
        onMessageData(resp as PipelineResponseInstance<RequestNameToResponseName<Req>>)

        // Remove from pending requests
        pipelineClient.debounceCache.delete(requestName)
        pendingRequests.delete(requestId)
        // Close WebSocket connection and resolve Promise
        pipelineWebSocket.close()
        console.log(`Pipeline: Request '${requestName}' completed!`)

        resolve()
        clearTimeout(timeout)
      }
    })

    pipelineWebSocket.on('error', (error) => {
      console.error(`Pipeline error for '${requestName}' - requestId ${requestId}:`, error)
      reject(error)
      pendingRequests.delete(requestId)
      clearTimeout(timeout)
    })

    pipelineWebSocket.on('close', () => {
      pendingRequests.delete(requestId)
    })
  }).catch((err) => {
    console.error(`Pipeline: Request failed for '${requestName}'`, err)
    pendingRequests.delete(requestId)
    pipelineWebSocket.close()
    throw err
  })
  pendingRequests.set(requestId, requestPromise)

  return requestPromise
}

export function mergeTagInfo(currentTagInfo: HtmlTagInfo | undefined, newTagInfo: {
  props: string[]
  events: string[]
}): HtmlTagInfo {
  return {
    props: [...new Set([...currentTagInfo?.props ?? [], ...newTagInfo.props])],
    events: [...new Set([...currentTagInfo?.events ?? [], ...newTagInfo.events])],
  }
}
