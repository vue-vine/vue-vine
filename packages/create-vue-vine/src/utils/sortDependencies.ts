export default function sortDependencies(packageJson: Record<string, any>): Record<string, any> {
  const sorted = {}

  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

  for (const depType of depTypes) {
    if (packageJson[depType]) {
      // @ts-expect-error - TS doesn't like the dynamic key
      sorted[depType] = {}

      Object.keys(packageJson[depType])
        .sort()
        .forEach((name) => {
          // @ts-expect-error - TS doesn't like the dynamic key
          sorted[depType][name] = packageJson[depType][name]
        })
    }
  }

  return {
    ...packageJson,
    ...sorted,
  }
}
