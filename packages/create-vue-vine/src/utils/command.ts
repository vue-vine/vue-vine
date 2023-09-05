const userAgent = process.env.npm_config_user_agent ?? ''
const packageManager = /pnpm/.test(userAgent) ? 'pnpm' : /yarn/.test(userAgent) ? 'yarn' : 'npm'

export function getPmCommand(command: 'install' | 'dev') {
  let commands: string[]
  if (packageManager === 'pnpm') {
    commands = ['pnpm', command]
  }
  else {
    commands = [packageManager, command === 'install' ? '' : 'run', command]
  }
  return commands.join(' ')
}
