#!/usr/bin/env node
import { Cli, friendlyErrorPlugin, notFoundPlugin, strictFlagsPlugin } from 'clerc'

import { description, name, version } from '../package.json'
import { createCommand } from './commands/create'

Cli({ scriptName: name, version, description })
  .use(strictFlagsPlugin())
  .use(notFoundPlugin())
  .use(friendlyErrorPlugin())
  .command(createCommand)
  .parse()
