import { defineConfig } from 'tsup'
import base from '../../tsup.config'

export default defineConfig({
  ...base,
  format: ['esm'],
  dts: false,
  banner: {
    js: '#!/usr/bin/env node\n',
  },
})
