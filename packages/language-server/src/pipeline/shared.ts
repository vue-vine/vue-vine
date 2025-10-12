import type { Connection } from '@volar/language-server'
import type { PipelineRequest } from '@vue-vine/language-service'
import type { PipelineReqArgs, PipelineResponseInstance, ReqToRespName } from '../../../language-service/typescript-plugin/types'
import type { HtmlTagInfo } from '../types'

export const tsServerForwardingCtx: {
  requestId: number
  requestHandlers: Map<number, (res: any) => void>
} = {
  requestId: 0,
  requestHandlers: new Map(),
}

export async function sendTsServerRequest<
  Req extends PipelineRequest['type'],
>(
  connection: Connection,
  command: Req extends `${infer U}Request` ? U : never,
  args: PipelineReqArgs<Req>,
): Promise<PipelineResponseInstance<ReqToRespName<Req>> | null> {
  return await new Promise<PipelineResponseInstance<ReqToRespName<Req>> | null>((resolve) => {
    const requestId = ++tsServerForwardingCtx.requestId
    tsServerForwardingCtx.requestHandlers.set(requestId, resolve)
    connection.sendNotification(
      'tsserver/request',
      [requestId, `_vue_vine:${command}`, args],
    )
  })
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
