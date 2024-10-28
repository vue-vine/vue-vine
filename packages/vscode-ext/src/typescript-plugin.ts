import { createVueVineTypeScriptPlugin } from '@vue-vine/language-service/typescript-plugin'

const plugin = createVueVineTypeScriptPlugin()

// @ts-expect-error TypeScript Plugin needs to be exported with `export =`
// eslint-disable-next-line no-restricted-syntax
export = plugin
