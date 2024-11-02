import { createVueVineTypeScriptPlugin } from '@vue-vine/language-service/typescript-plugin'

const plugin = createVueVineTypeScriptPlugin()

// @ts-expect-error - TS Plugin requires a cjs format now
// eslint-disable-next-line no-restricted-syntax
export = plugin
