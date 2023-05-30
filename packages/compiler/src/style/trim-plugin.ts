import type { PluginCreator } from 'postcss'

const trimPlugin: PluginCreator<{}> = () => {
  return {
    postcssPlugin: 'vine-style-trim',
    Once(root) {
      root.walk(({ type, raws }) => {
        if (type === 'rule' || type === 'atrule') {
          if (raws.before)
            raws.before = '\n'
          if ('after' in raws && raws.after)
            raws.after = '\n'
        }
      })
    },
  }
}

trimPlugin.postcss = true
export {
  trimPlugin,
}
