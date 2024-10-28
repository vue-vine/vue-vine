import type { Language } from '@vue/language-core'
import type * as ts from 'typescript'
import type { RequestContext } from './requests/types'
import * as fs from 'node:fs'
import * as net from 'node:net'
import { collectExtractProps } from './requests/collect-extract-props'
import { getComponentEvents, getComponentNames, getComponentProps, getElementAttrs, getTemplateContextProps } from './requests/component-infos'
import { getImportPathForFile } from './requests/get-import-path-for-file'
import { getPropertiesAtLocation } from './requests/get-properties-at-location'
import { getQuickInfoAtPosition } from './requests/get-quick-info-at-position'
import { connect, getNamedPipePath } from './utils'

export interface Request {
  type: 'containsFile'
    | 'projectInfo'
    | 'collectExtractProps'
    | 'getImportPathForFile'
    | 'getPropertiesAtLocation'
    | 'getQuickInfoAtPosition'
  // Component Infos
    | 'getComponentProps'
    | 'getComponentEvents'
    | 'getTemplateContextProps'
    | 'getComponentNames'
    | 'getElementAttrs'
  args: [fileName: string, ...rest: any]
}

export interface ProjectInfo {
  name: string
  kind: ts.server.ProjectKind
  currentDirectory: string
}

export async function startNamedPipeServer(
  ts: typeof import('typescript'),
  info: ts.server.PluginCreateInfo,
  language: Language<string>,
  projectKind: ts.server.ProjectKind.Inferred | ts.server.ProjectKind.Configured,
) {
  const server = net.createServer((connection) => {
    connection.on('data', (data) => {
      const text = data.toString()
      if (text === 'ping') {
        connection.write('pong')
        return
      }
      const request: Request = JSON.parse(text)
      const fileName = request.args[0]
      const requestContext: RequestContext = {
        typescript: ts,
        languageService: info.languageService,
        languageServiceHost: info.languageServiceHost,
        language,
        isTsPlugin: true,
        getFileId: (fileName: string) => fileName,
      }
      if (request.type === 'containsFile') {
        sendResponse(
          info.project.containsFile(ts.server.toNormalizedPath(fileName)),
        )
      }
      else if (request.type === 'projectInfo') {
        sendResponse({
          name: info.project.getProjectName(),
          kind: info.project.projectKind,
          currentDirectory: info.project.getCurrentDirectory(),
        } satisfies ProjectInfo)
      }
      else if (request.type === 'collectExtractProps') {
        const result = collectExtractProps.apply(requestContext, request.args as any)
        sendResponse(result)
      }
      else if (request.type === 'getImportPathForFile') {
        const result = getImportPathForFile.apply(requestContext, request.args as any)
        sendResponse(result)
      }
      else if (request.type === 'getPropertiesAtLocation') {
        const result = getPropertiesAtLocation.apply(requestContext, request.args as any)
        sendResponse(result)
      }
      else if (request.type === 'getQuickInfoAtPosition') {
        const result = getQuickInfoAtPosition.apply(requestContext, request.args as any)
        sendResponse(result)
      }
      // Component Infos
      else if (request.type === 'getComponentProps') {
        const result = getComponentProps.apply(requestContext, request.args as any)
        sendResponse(result)
      }
      else if (request.type === 'getComponentEvents') {
        const result = getComponentEvents.apply(requestContext, request.args as any)
        sendResponse(result)
      }
      else if (request.type === 'getTemplateContextProps') {
        const result = getTemplateContextProps.apply(requestContext, request.args as any)
        sendResponse(result)
      }
      else if (request.type === 'getComponentNames') {
        const result = getComponentNames.apply(requestContext, request.args as any)
        sendResponse(result)
      }
      else if (request.type === 'getElementAttrs') {
        const result = getElementAttrs.apply(requestContext, request.args as any)
        sendResponse(result)
      }
      else {
        console.warn('[Vue Vine Named Pipe Server] Unknown request type:', request.type)
      }
    })
    connection.on('error', err => console.error('[Vue Vine Named Pipe Server]', err.message))

    function sendResponse(data: any | undefined) {
      connection.write(`${JSON.stringify(data ?? null)}\n\n`)
    }
  })

  for (let i = 0; i < 20; i++) {
    const path = getNamedPipePath(projectKind, i)
    const socket = await connect(path, 100)
    if (typeof socket === 'object') {
      socket.end()
    }
    const namedPipeOccupied = typeof socket === 'object' || socket === 'timeout'
    if (namedPipeOccupied) {
      continue
    }
    const success = await tryListen(server, path)
    if (success) {
      break
    }
  }
}

function tryListen(server: net.Server, namedPipePath: string) {
  return new Promise<boolean>((resolve) => {
    const onError = (err: any) => {
      if ((err as any).code === 'ECONNREFUSED') {
        try {
          // eslint-disable-next-line no-console
          console.log('[Vue Vine Named Pipe Client] Deleting:', namedPipePath)
          fs.promises.unlink(namedPipePath)
        }
        catch { }
      }
      server.off('error', onError)
      server.close()
      resolve(false)
    }
    const onSuccess = () => {
      server.off('error', onError)
      resolve(true)
    }
    server.listen(namedPipePath, onSuccess)
    server.on('error', onError)
  })
}
