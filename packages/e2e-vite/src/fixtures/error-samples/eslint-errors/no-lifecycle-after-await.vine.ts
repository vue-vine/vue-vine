declare const doSomethingAsync: () => Promise<void>;

export async function TestNoLifecycleHookAfterAwait() {
  await doSomethingAsync()

  onMounted(() => {
    // ...
  })

  return vine`
    <p>...</p>
  `
}
