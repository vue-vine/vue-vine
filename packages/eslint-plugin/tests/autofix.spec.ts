import { run } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'
import { vineParser } from '../src'
import vineTemplateFormat from '../src/rules/format/format-vine-template'
import { prettierSnapshot } from '../src/utils'

const code = `
function TestComp() {
  return vine\`
<div>
     HelloWorld
  </div>
    <!-- TEST COMMENT -->
    <p
>Chaos</p>
\`
}\n`.trim()

run({
  name: 'vue-vine/format-vine-template',
  recursive: false,
  verifyAfterFix: false,
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: vineParser,
  },
  rule: vineTemplateFormat,
  invalid: [
    {
      description: 'should correctly fix Vue Vine template',
      code,
      output(result) {
        expect(prettierSnapshot(result)).toMatchInlineSnapshot(`
          "
           ┌───┬────────────────────────────────
           │ 1 │function TestComp() {
           │ 2 │  return vine\`
           │ 3 │    <div>HelloWorld</div>
           │ 4 │    <!-- TEST COMMENT -->
           │ 5 │    <p>Chaos</p>
           │ 6 │  \`
           │ 7 │}
           └───┴────────────────────────────────
            "
        `)
      },
    },
  ],
})
