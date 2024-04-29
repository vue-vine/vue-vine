import process from 'node:process'
import { execa } from 'execa'

const userAgent = process.env.npm_config_user_agent ?? ''

const packageManager = /pnpm/.test(userAgent)
  ? 'pnpm'
  : /yarn/.test(userAgent)
    ? /bun/.test(userAgent)
      ? 'bun'
      : 'yarn'
    : 'npm'

type Command = 'install' | 'dev'

export function getPmCommand(command: Command) {
  let commands: [string, string[]]
  if (packageManager === 'pnpm') {
    commands = ['pnpm', [command]]
  }
  else {
    commands = [packageManager, [command === 'install' ? '' : 'run', command].filter(Boolean)]
  }
  return commands
}

export function formatPmCommand(commands: [string, string[]]) {
  return commands.flat().join(' ')
}

export function runPmCommand(command: Command, cwd: string) {
  return execa(...getPmCommand(command), { stdio: 'inherit', cwd })
}
