import type { VueVineCode } from '@vue-vine/language-service'
import type * as ts from 'typescript'
import type { HtmlTagInfo, PipelineContext, RequestResolver } from '../types'
import { randomUUID } from 'node:crypto'
import { pipelineRequest, tryParsePipelineResponse } from '@vue-vine/language-service'
import { WebSocket } from 'ws'
import { getPipelineServerPort } from './get-pipeline-server-port'

interface GetComponentPropsContext {
  vineVirtualCode: VueVineCode
  tagInfos: Map<string, HtmlTagInfo>
  pipelineStatus: PipelineContext
  tsConfigFileName: string
  tsHost: ts.System
}

const REQUEST_TIMEOUT = 10000

// Create a cache to prevent duplicate requests for the same component
// This will persist across multiple function calls
const requestCache = new Set<string>()

export function getComponentPropsFromPipeline(
  tag: string,
  {
    tagInfos,
    vineVirtualCode,
    pipelineStatus,
    tsConfigFileName,
    tsHost,
  }: GetComponentPropsContext,
) {
  // Generate a cache key based on filename and component
  const cacheKey = `${vineVirtualCode.fileName}:${tag}`

  // Check if we already requested this component recently
  if (requestCache.has(cacheKey)) {
    console.log(`Pipeline: Hit request cache for component "${tag}"`)
    return Promise.resolve()
  }

  // Add to cache to prevent duplicate requests
  requestCache.add(cacheKey)
  console.log(`Pipeline: Creating new request for component "${tag}"`)

  const port = getPipelineServerPort(tsConfigFileName, tsHost)
  const pipelineClient = new WebSocket(`ws://localhost:${port}`)

  const requestId = randomUUID()

  const requestPromise = new Promise<void>((resolve, reject) => {
    // set request timeout
    const timeout = setTimeout(() => {
      const resolver = pipelineStatus.pendingRequests.get(requestId)
      if (resolver) {
        resolver.reject(new Error(`Pipeline request timeout for component: ${tag}`))
        pipelineStatus.pendingRequests.delete(requestId)
      }
      pipelineClient.close()
    }, REQUEST_TIMEOUT)

    // store resolver for later use
    const resolver: RequestResolver = {
      resolve,
      reject,
      timeout,
    }
    pipelineStatus.pendingRequests.set(requestId, resolver)

    pipelineClient.on('open', () => {
      console.log(`Pipeline: Fetching component '${tag}' props, requestId: ${requestId}`)
      pipelineClient.send(
        pipelineRequest({
          type: 'getComponentPropsRequest',
          requestId,
          componentName: tag,
          fileName: vineVirtualCode.fileName,
        }),
      )
    })

    pipelineClient.on('message', (msgData) => {
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

      console.log(`Pipeline: Got message`, JSON.stringify(resp, null, 2))

      if (
        resp.type === 'getComponentPropsResponse'
        && resp.requestId === requestId
      ) {
        // ensure this response is for our request
        tagInfos.set(tag, {
          props: [...resp.props],
          events: [],
        })

        // Clear timeout timer
        const resolver = pipelineStatus.pendingRequests.get(requestId)
        if (resolver?.timeout) {
          clearTimeout(resolver.timeout)
        }

        // Remove from pending requests
        pipelineStatus.pendingRequests.delete(requestId)
        // Close WebSocket connection and resolve Promise
        pipelineClient.close()
        // Remove from cache when done
        requestCache.delete(cacheKey)
        console.log(`Pipeline: Get component props for "${tag}" completed, removed from cache`)
        resolve()
      }
    })

    pipelineClient.on('error', (error) => {
      console.error(`Pipeline error for requestId ${requestId}:`, error)
      reject(error)

      // 清理资源
      const resolver = pipelineStatus.pendingRequests.get(requestId)
      if (resolver?.timeout) {
        clearTimeout(resolver.timeout)
      }
      pipelineStatus.pendingRequests.delete(requestId)

      // Remove from cache on error
      requestCache.delete(cacheKey)
      console.log(`Pipeline: Request for "${tag}" failed, removed from cache`)
    })

    pipelineClient.on('close', () => {
      // Ensure resources are cleaned up when closing
      const resolver = pipelineStatus.pendingRequests.get(requestId)
      if (resolver?.timeout) {
        clearTimeout(resolver.timeout)
      }
    })
  }).catch((err) => {
    console.error(`Pipeline request failed for ${tag}:`, err)
    pipelineStatus.pendingRequests.delete(requestId)
    pipelineClient.close()
    // Remove from cache when the promise is rejected
    requestCache.delete(cacheKey)
    console.log(`Pipeline: Request for "${tag}" failed in catch handler, removed from cache`)
    throw err
  })

  return requestPromise
}
