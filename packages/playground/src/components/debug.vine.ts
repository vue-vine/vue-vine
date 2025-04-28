/**
 * This is a placeholder for debugging virutal code.
 * 
 * So please revert any changes made in this file before you commit,
 * in order to remain a clean environment for testing.
 */

function DebugTest(props: {
  foo: string;
  bar: number;
}) {
  vineValidators({
    foo: (val) => val.startsWith('vine:'),
    bar: (val) => val > 5,
  })

  return vine`
    <div>...</div>
  `
}

export {
  DebugTest,
}
