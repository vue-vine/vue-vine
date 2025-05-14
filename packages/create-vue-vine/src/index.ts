#!/usr/bin/env node
import { Clerc, friendlyErrorPlugin, helpPlugin, notFoundPlugin, strictFlagsPlugin } from 'clerc'

import { description, name, version } from '../package.json'
import { createCommand } from './commands/create'

Clerc.create(name, version, description)
  .use(helpPlugin())
  .use(notFoundPlugin())
  .use(strictFlagsPlugin())
  .use(notFoundPlugin())
  .use(friendlyErrorPlugin())
  .command(createCommand)
  .parse()
