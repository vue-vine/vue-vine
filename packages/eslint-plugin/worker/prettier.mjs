import { runAsWorker } from 'synckit'

let prettier

runAsWorker(async (code, options) => {
  if (!prettier)
    prettier = await import('prettier')
  return prettier.format(code, options)
})
