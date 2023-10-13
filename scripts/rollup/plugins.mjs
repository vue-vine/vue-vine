import { rmSync } from 'node:fs'
import { exec } from 'node:child_process'

export function cleanDist(distPath) {
  return {
    name: 'cleanDist',
    buildStart() {
      rmSync(distPath, { recursive: true, force: true })
    },
  }
}

export function runTscOnFinished(cwd) {
  return {
    name: 'runTscOnFinished',
    buildEnd() {
      exec('tsc', { stdio: 'inherit', cwd, shell: true })
    },
  }
}
