import process from 'node:process'

export function toExitErr(err) {
  console.error(err)
  process.exit(1)
}
