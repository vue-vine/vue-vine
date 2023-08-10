import { Clerc, Root, friendlyErrorPlugin, helpPlugin, notFoundPlugin, strictFlagsPlugin } from 'clerc'

import { description, name, version } from '../package.json'

Clerc.create(name, version, description)
  .use(helpPlugin())
  .use(notFoundPlugin())
  .use(strictFlagsPlugin())
  .use(notFoundPlugin())
  .use(friendlyErrorPlugin())
  .command(Root, 'Create a Vue Vine project', {
    parameters: [
      '[dir]',
    ],
    alias: 'create',
  })
  .on(Root, (ctx) => {

  })
  .parse()
