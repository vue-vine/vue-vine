import { defineConfig } from 'tsdown'
import base from '../../tsdown.config.ts'

export default defineConfig({
  ...base,
  format: ['esm'],
  dts: false,
  outputOptions: {
    banner: '#!/usr/bin/env node\n',
  },
})
