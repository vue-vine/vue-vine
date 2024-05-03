import process from 'node:process'
import { execa, execaSync } from 'execa'

const userAgentEnv = process.env.npm_config_user_agent ?? ''

function detectPackageManager() {
  const fromUserAgent = /pnpm/.test(userAgentEnv)
    ? 'pnpm'
    : /yarn/.test(userAgentEnv)
      ? /bun/.test(userAgentEnv)
        ? 'bun'
        : 'yarn'
      : undefined

  if (fromUserAgent)
    return fromUserAgent

  let pnpmVersionExitCode: number,
    yarnVersionExitCode: number

  // Run 'pnpm --version' to check if pnpm is installed
  try {
    pnpmVersionExitCode = execaSync('pnpm', ['--version'], { stdio: 'ignore' }).exitCode
  }
  catch (error) {
    pnpmVersionExitCode = -1
  }
  // Run 'yarn --version' to check if yarn is installed
  try {
    yarnVersionExitCode = execaSync('yarn', ['--version'], { stdio: 'ignore' }).exitCode
  }
  catch (error) {
    yarnVersionExitCode = -1
  }

  if (pnpmVersionExitCode === 0) {
    return 'pnpm'
  }
  else if (yarnVersionExitCode === 0) {
    return 'yarn'
  }

  return 'npm'
}

const packageManager = detectPackageManager()

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
