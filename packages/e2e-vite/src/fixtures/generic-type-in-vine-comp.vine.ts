// #region Test generics on Vine component function

export function TestGenericComp1<T extends keyof HTMLElementTagNameMap = 'h1'>(
  props: Partial<HTMLElementTagNameMap[T]> & { as: T },
) {
  return vine`
    <component :is="as" />
  `
}

// #endregion
