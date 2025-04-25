declare module 'merge-source-map' {
  export default function merge(oldMap: object, newMap: object): object
}

declare module 'estree-walker' {
  export function walk<R, N extends import('@babel/types').Node>(
    root: R,
    options: {
      enter?: (node: N, parent: N | null) => any
      leave?: (node: N, parent: N | null) => any
      exit?: (node: N) => any
    } & ThisType<{ skip: () => void }>,
  )
}
