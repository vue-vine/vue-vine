import type { VineQuery } from '../../compiler/src/types'
import { QUERY_TYPE_SCRIPT } from './constants'

type VineQueryRaw = Record<keyof VineQuery, string>

export function parseQuery(id: string) {
  const [filePath, queryRawStr] = id.split('?', 2) as [fileId: string, queryRawStr?: string]
  const rawQuery = Object.fromEntries(new URLSearchParams(queryRawStr)) as VineQueryRaw
  const query: VineQuery = {
    type: rawQuery.type == null ? QUERY_TYPE_SCRIPT : rawQuery.type,
    lang: rawQuery.lang,
    scopeId: rawQuery.scopeId,
    scoped: rawQuery.scoped === 'true',
    index: Number(rawQuery.index),
    vineFileId: rawQuery.vineFileId,
  }

  return {
    filePath,
    query,
  }
}
