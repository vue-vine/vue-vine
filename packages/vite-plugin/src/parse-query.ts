import { QUERY_TYPE_SCRIPT } from './constants'

export interface VineQuery {
  type: string
  scopeId: string
  scoped: boolean
  lang: string
  index: number
}
type VineQueryRaw = Record<keyof VineQuery, string>

export function parseQuery(id: string) {
  const [fileId, queryRawStr] = id.split('?', 2) as [fileId: string, queryRawStr: string | undefined]
  const rawQuery = Object.fromEntries(new URLSearchParams(queryRawStr)) as VineQueryRaw
  const query: VineQuery = {
    type: rawQuery.type == null ? QUERY_TYPE_SCRIPT : rawQuery.type,
    lang: rawQuery.lang,
    scopeId: rawQuery.scopeId,
    scoped: rawQuery.scoped === 'true',
    index: Number(rawQuery.index),
  }

  return {
    fileId,
    query,
  }
}
