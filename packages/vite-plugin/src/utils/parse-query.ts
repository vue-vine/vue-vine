export interface VineQuery {
  type: string
  scopeId: string
  scoped: boolean
  lang: string
}
type VineQueryRaw = Record<keyof VineQuery, string>

export const QUERY_TYPE_SCRIPT = 'vine-script'
export const QUERY_TYPE_STYLE = 'vine-style'

export function parseQuery(id: string) {
  const [fileId, queryRawStr] = id.split('?', 2)
  const rawQuery = Object.fromEntries(new URLSearchParams(queryRawStr)) as VineQueryRaw
  const query: VineQuery = {
    type: rawQuery.type == null ? 'vine-script' : rawQuery.type,
    lang: rawQuery.lang,
    scopeId: rawQuery.scopeId,
    scoped: rawQuery.scoped === 'true',
  }

  return {
    fileId,
    query,
  }
}
