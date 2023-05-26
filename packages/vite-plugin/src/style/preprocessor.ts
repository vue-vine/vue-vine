import merge from 'merge-source-map'
import type { VineProcessorLang } from '../shared'
import type { StylePreprocessor } from './types'

// scss/.sass processor
const scss: StylePreprocessor = (source, map, options, load = require) => {
  const nodeSass = load('sass')
  const finalOptions = {
    ...options,
    data: source,
    sourceMap: Boolean(map),
  }

  try {
    const result = nodeSass.renderSync(finalOptions)
    const dependencies = result.stats.includedFiles
    if (map) {
      return {
        code: result.css.toString(),
        map: merge(map, JSON.parse(result.map.toString())),
        errors: [],
        dependencies,
      }
    }

    return { code: result.css.toString(), errors: [], dependencies }
  }
  catch (e: any) {
    return { code: '', errors: [e], dependencies: [] }
  }
}

const sass: StylePreprocessor = (source, map, options, load = require) => scss(
  source,
  map,
  {
    ...options,
    indentedSyntax: true,
  },
  load,
)

// less
const less: StylePreprocessor = (source, map, options, load = require) => {
  const nodeLess = load('less')

  let result: any
  let error: Error | null = null
  nodeLess.render(
    source,
    { ...options, syncImport: true },
    (err: Error | null, output: any) => {
      error = err
      result = output
    },
  )

  if (error)
    return { code: '', errors: [error], dependencies: [] }
  const dependencies = result.imports
  if (map) {
    return {
      code: result.css.toString(),
      map: merge(map, result.map),
      errors: [],
      dependencies,
    }
  }

  return {
    code: result.css.toString(),
    errors: [],
    dependencies,
  }
}

// stylus
const stylus: StylePreprocessor = (source, map, options, load = require) => {
  const nodeStylus = load('stylus')
  try {
    const ref = nodeStylus(source)
    Object.keys(options).forEach(key => ref.set(key, options[key]))
    if (map)
      ref.set('sourcemap', { inline: false, comment: false })

    const result = ref.render()
    const dependencies = ref.deps()
    if (map) {
      return {
        code: result,
        map: merge(map, ref.sourcemap),
        errors: [],
        dependencies,
      }
    }

    return { code: result, errors: [], dependencies }
  }
  catch (e: any) {
    return { code: '', errors: [e], dependencies: [] }
  }
}

export const processors: Record<VineProcessorLang, StylePreprocessor> = {
  less,
  sass,
  scss,
  stylus,
}
