import type * as ts from 'typescript'
import { createVueVineTypeScriptPlugin } from '@vue-vine/language-service/typescript-plugin'

const plugin: ts.server.PluginModuleFactory = createVueVineTypeScriptPlugin()

// eslint-disable-next-line no-restricted-syntax
export = plugin
