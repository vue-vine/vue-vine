import path from 'node:path'
import fs, { readFileSync } from 'node:fs'
import type { VineCompilerCtx } from '@vue-vine/compiler'
import type { HmrContext } from 'vite'
import type { VineQuery } from './parse-query'
import { parseQuery } from './parse-query'

export function saveImportCssFile(fileId: string, styleSource: string, compilerCtx: VineCompilerCtx, fullFileId: string) {
  const stylePath = path.resolve(path.dirname(fileId), styleSource)
  styleSource = fs.readFileSync(stylePath, 'utf-8')
  const data = Object.assign({}, compilerCtx.fileCtxMap.get(fullFileId))
  compilerCtx.fileCtxMap.set(stylePath, data!)
  compilerCtx.fileCtxMap.get(stylePath)!.importStyleOriginCode = styleSource
  return {
    stylePath,
    styleSource,
  }
}
export async function hmrImportCss(ctx: HmrContext, file: string, compilerCtx: VineCompilerCtx, watchedFiles: Map<string, string>) {
  let prevImportStyleCode = ''
  let styleFileQuery: VineQuery
  prevImportStyleCode = compilerCtx.fileCtxMap.get(file)!.importStyleOriginCode!

  const virtualId = watchedFiles.get(file)
  const { query } = parseQuery(virtualId!)
  styleFileQuery = query
  const module = ctx.server.moduleGraph.getModuleById(virtualId!)
  for (let d of module!.importers.entries()!) {
    // 得到父模块
    let parentModule = ctx.server.moduleGraph.getModuleById(d[0].id!)
    const currentVineFileCtx = compilerCtx.fileCtxMap.get(ctx.file)
    if (currentVineFileCtx) {
      // 将父模块添加到当前文件的依赖列表中
      currentVineFileCtx.styleDefine[query.scopeId][query.index].source = await ctx.read()
      ctx.modules.push(parentModule!)
      ctx.file = <string>parentModule?.file
      // 更新外部css文件内容的读取
      ctx.read = () => readFileSync(ctx.file!, 'utf-8')
      const parentVineFileCtx = compilerCtx.fileCtxMap.get(ctx.file)!
      // 更新父模块的vineCtx外部导入到css内容
      parentVineFileCtx.importStyleOriginCode = currentVineFileCtx.styleDefine[query.scopeId][query.index].source
    }
  }
  return {
    prevImportStyleCode,
    styleFileQuery,
  }
}
