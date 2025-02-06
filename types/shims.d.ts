declare module 'merge-source-map' {
  export default function merge(oldMap: object, newMap: object): object
}

declare module 'estree-walker' {
  export function walk<T>(
    root: T,
    options: {
      enter?: (node: T, parent: T | null) => any
      leave?: (node: T, parent: T | null) => any
      exit?: (node: T) => any
    } & ThisType<{ skip: () => void }>,
  )
}
