import Module from 'node:module'
import path from 'node:path'

export const createRequire: (filename: string) => (modname: string) => any
// Added in v12.2.0
  = (Module as any).createRequire
  // Added in v10.12.0, but deprecated in v12.2.0.
  // eslint-disable-next-line node/no-deprecated-api
    || (Module as any).createRequireFromPath
  // Polyfill - This is not executed on the tests on node@>=10.
  /* istanbul ignore next */
    || ((modname) => {
      const mod = new Module(modname)

      mod.filename = modname
      mod.paths = (Module as any)._nodeModulePaths(path.dirname(modname))
      ;(mod as any)._compile('module.exports = require;', modname)
      return mod.exports
    })
