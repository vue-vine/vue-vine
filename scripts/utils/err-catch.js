// import process from 'node:process'

export function toExitErr(err) {
  console.log(`[DEBUG] toExitErr: ${err}`)
  console.error(err)
  throw err
}
