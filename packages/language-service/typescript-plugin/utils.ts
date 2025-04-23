import type { PipelineRequest, PipelineResponse } from './types'

export function pipelineRequest<T extends PipelineRequest>(data: T) {
  return JSON.stringify(data)
}

export function pipelineResponse<T extends PipelineResponse>(data: T) {
  return JSON.stringify(data)
}

export function tryParsePipelineResponse(
  data: string,
  onError?: (e: unknown) => void,
): PipelineResponse | undefined {
  try {
    return JSON.parse(data)
  }
  catch (err) {
    onError?.(err)
    return (void 0)
  }
}
