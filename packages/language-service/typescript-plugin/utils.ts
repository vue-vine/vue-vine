import type { PipelineLogger, PipelineRequest, PipelineResponse, PipelineServerContext } from './types'
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

export function createPipelineLogger({ enabled = false }: {
  enabled?: boolean
} = {}): PipelineLogger {
  const logger: PipelineLogger = {
    enabled,
    info: (...msg: string[]) => {
      if (!logger.enabled)
        return
      console.log(`[INFO] ${new Date().toLocaleString()}: `, ...msg)
    },
    error: (...msg: string[]) => {
      if (!logger.enabled)
        return
      console.error(`[ERROR] ${new Date().toLocaleString()}: `, ...msg)
    },
  }
  return logger
}
