import type { VueVineCode } from '@vue-vine/language-service'
import type * as ts from 'typescript'
import type { HtmlTagInfo, PipelineStatus } from '../types'
import { pipelineRequest, tryParsePipelineResponse } from '@vue-vine/language-service'
import { WebSocket } from 'ws'
import { getPipelineServerPort } from './get-pipeline-server-port'

interface GetComponentPropsContext {
  vineVirtualCode: VueVineCode
  tagInfos: Map<string, HtmlTagInfo>
  pipelineStatus: PipelineStatus
  tsConfigFileName: string
  tsHost: ts.System
}

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
  const port = getPipelineServerPort(tsConfigFileName, tsHost)
  const pipelineClient = new WebSocket(`ws://localhost:${port}`)
  const requestPromise = new Promise<void>((resolve, reject) => {
    pipelineClient.on('open', () => {
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
        if (resp.type === 'getComponentPropsResponse') {
          tagInfos.set(tag, {
            props: [...resp.props],
            events: [],
          })
          resolve()
        }
      })

      console.log(`Pipeline: Fetching component '${tag}' props`)
      pipelineClient.send(
        pipelineRequest({
          type: 'getComponentPropsRequest',
          componentName: tag,
          fileName: vineVirtualCode.fileName,
        }),
      )
    })
  }).finally(() => {
    pipelineClient.close()
    pipelineStatus.pendingRequest.delete('getComponentPropsRequest')
  })
  pipelineStatus.pendingRequest.set('getComponentPropsRequest', requestPromise)
}
