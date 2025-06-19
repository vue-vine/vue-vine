import type { Message, ProcessOptions, Result } from 'postcss'
import type { RawSourceMap } from 'source-map-js'
import type { VineCompilerCtx, VineProcessorLang } from '../types'
import postcss from 'postcss'
import { cssVarsPlugin } from './css-vars-plugin'
import { processors } from './preprocessor'
import { scopedPlugin } from './scoped-plugin'
import { trimPlugin } from './trim-plugin'

export async function compileVineStyle(
  compilerCtx: VineCompilerCtx,
  params: {
    vineFileId: string
    source: string
    isScoped: boolean
    scopeId: string
    preprocessLang?: VineProcessorLang
    inputSourceMap?: RawSourceMap
    preprocessOptions?: Record<string, any>
    postcssOptions?: any
    postcssPlugins?: any[]

    onErr?: (msg: string) => void
    onWarn?: (msg: string) => void
  },
): Promise<{
  code: string
  map?: RawSourceMap
  errors: Error[]
  rawResult?: Result
  dependencies: Set<string>
}> {
  let { source } = params
  const {
    vineFileId,
    isScoped,
    scopeId,
    preprocessLang,
    inputSourceMap,
    preprocessOptions = compilerCtx.options.preprocessOptions ?? {},
    postcssOptions = compilerCtx.options.postcssOptions,
    postcssPlugins: userPostcssPlugins = compilerCtx.options.postcssPlugins ?? [],
  } = params
  const preprocessor = preprocessLang && processors[preprocessLang]
  const preProcessedSource = preprocessor?.(
    source,
    inputSourceMap,
    preprocessOptions,
  )
  const map = preProcessedSource
    ? preProcessedSource.map
    : inputSourceMap
  if (preProcessedSource) {
    source = preProcessedSource.code
  }

  const postcssPlugins = [
    trimPlugin(),
    ...userPostcssPlugins,
  ]
  if (isScoped) {
    const shortId = scopeId.replace(/^data-v-/, '')
    const longId = `data-v-${shortId}`
    postcssPlugins.push(
      scopedPlugin({
        compilerCtx,
        id: longId,
        fileCtx: compilerCtx.fileCtxMap.get(vineFileId)!,
      }),
    )
  }

  // transform css v-bind
  if (source.includes('v-bind')) {
    postcssPlugins.push(cssVarsPlugin({
      fileCtx: compilerCtx.fileCtxMap.get(vineFileId)!,
      scopeId,
    }))
  }

  const postCSSOptions: ProcessOptions = {
    ...postcssOptions,
    // prevent warnings, we don't need file name
    from: undefined,
    to: undefined,
  }
  if (map) {
    postCSSOptions.map = {
      inline: false,
      annotation: false,
      prev: map,
    }
  }

  const errors: Error[] = []
  if (preProcessedSource && preProcessedSource.errors.length) {
    errors.push(...preProcessedSource.errors)
  }

  const dependencies = new Set(
    preProcessedSource ? preProcessedSource.dependencies : [],
  )
  const recordPlainCssDependencies = (messages: Message[]) => {
    messages.forEach((msg) => {
      if (msg.type === 'dependency') {
        // postcss output path is absolute position path
        dependencies.add(msg.file)
      }
    })
    return dependencies
  }

  const result = postcss(postcssPlugins).process(source, postCSSOptions)

  return result
    .then(result => ({
      code: result.css || '',
      map: result.map && result.map.toJSON(),
      errors,
      rawResult: result,
      dependencies: recordPlainCssDependencies(result.messages),
    }))
    .catch(error => ({
      code: '',
      map: undefined,
      errors: [...errors, error],
      rawResult: undefined,
      dependencies,
    }))
}
