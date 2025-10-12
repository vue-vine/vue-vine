import type { PipelineRequest, PipelineResponse, PipelineServerContext } from './types'
import { safeDestr } from 'destr'

export function pipelineRequest<T extends PipelineRequest>(data: T): string {
  return JSON.stringify(data)
}

export function pipelineResponse<T extends PipelineResponse>(
  context: PipelineServerContext,
  data: T,
): string {
  return JSON.stringify({
    ...data,
  })
}

export function tryParsePipelineResponse(
  data: string,
  onError?: (e: unknown) => void,
): PipelineResponse | undefined {
  try {
    return safeDestr(data)
  }
  catch (err) {
    onError?.(err)
    return (void 0)
  }
}
