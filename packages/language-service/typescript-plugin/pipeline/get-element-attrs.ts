import type { PipelineContext, PipelineRequestInstance } from '../types'
import { isVueVineVirtualCode } from '../../src'
import { getVariableType } from './utils'

export function handleGetElementAttrs(
  request: PipelineRequestInstance<'getElementAttrsRequest'>,
  context: PipelineContext,
) {
  const { ts, language, languageService } = context
  const { fileName, tagName } = request

  const volarFile = language.scripts.get(fileName)
  if (!isVueVineVirtualCode(volarFile?.generated?.root)) {
    return
  }
  const vueCode = volarFile.generated.root

  const program = languageService.getProgram()!
  const checker = program.getTypeChecker()
  const elements = getVariableType(ts, languageService, vueCode, '__VLS_elements')
  if (!elements) {
    return []
  }

  const elementType = elements.type.getProperty(tagName)
  if (!elementType) {
    return []
  }

  const attrs = checker.getTypeOfSymbol(elementType).getProperties()
  const result = attrs.map(c => c.name)
  context.tsPluginLogger.info('Pipeline: Got element attrs', result)

  return result
}
