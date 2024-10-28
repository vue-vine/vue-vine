import type { Request } from './server'
import { searchNamedPipeServerForFile, sendRequestWorker } from './utils'

export function collectExtractProps(
  ...args: Parameters<typeof import('./requests/collect-extract-props')['collectExtractProps']>
) {
  return sendRequest<ReturnType<typeof import('./requests/collect-extract-props')['collectExtractProps']>>({
    type: 'collectExtractProps',
    args,
  })
}

export async function getImportPathForFile(
  ...args: Parameters<typeof import('./requests/get-import-path-for-file')['getImportPathForFile']>
) {
  return await sendRequest<ReturnType<typeof import('./requests/get-import-path-for-file')['getImportPathForFile']>>({
    type: 'getImportPathForFile',
    args,
  })
}

export async function getPropertiesAtLocation(
  ...args: Parameters<typeof import('./requests/get-properties-at-location')['getPropertiesAtLocation']>
) {
  return await sendRequest<ReturnType<typeof import('./requests/get-properties-at-location')['getPropertiesAtLocation']>>({
    type: 'getPropertiesAtLocation',
    args,
  })
}

export function getQuickInfoAtPosition(
  ...args: Parameters<typeof import('./requests/get-quick-info-at-position')['getQuickInfoAtPosition']>
) {
  return sendRequest<ReturnType<typeof import('./requests/get-quick-info-at-position')['getQuickInfoAtPosition']>>({
    type: 'getQuickInfoAtPosition',
    args,
  })
}

// Component Infos

export function getComponentProps(
  ...args: Parameters<typeof import('./requests/component-infos')['getComponentProps']>
) {
  return sendRequest<ReturnType<typeof import('./requests/component-infos')['getComponentProps']>>({
    type: 'getComponentProps',
    args,
  })
}

export function getComponentEvents(
  ...args: Parameters<typeof import('./requests/component-infos')['getComponentEvents']>
) {
  return sendRequest<ReturnType<typeof import('./requests/component-infos')['getComponentEvents']>>({
    type: 'getComponentEvents',
    args,
  })
}

export function getTemplateContextProps(
  ...args: Parameters<typeof import('./requests/component-infos')['getTemplateContextProps']>
) {
  return sendRequest<ReturnType<typeof import('./requests/component-infos')['getTemplateContextProps']>>({
    type: 'getTemplateContextProps',
    args,
  })
}

export function getComponentNames(
  ...args: Parameters<typeof import('./requests/component-infos')['getComponentNames']>
) {
  return sendRequest<ReturnType<typeof import('./requests/component-infos')['getComponentNames']>>({
    type: 'getComponentNames',
    args,
  })
}

export function getElementAttrs(
  ...args: Parameters<typeof import('./requests/component-infos')['getElementAttrs']>
) {
  return sendRequest<ReturnType<typeof import('./requests/component-infos')['getElementAttrs']>>({
    type: 'getElementAttrs',
    args,
  })
}

async function sendRequest<T>(request: Request) {
  const server = (await searchNamedPipeServerForFile(request.args[0]))
  if (!server) {
    console.warn('[Vue Vine Named Pipe Client] No server found for', request.args[0])
    return
  }
  const res = await sendRequestWorker<T>(request, server.socket)
  server.socket.end()
  return res
}
