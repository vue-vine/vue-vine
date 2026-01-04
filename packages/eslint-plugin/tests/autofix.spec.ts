import { run } from 'eslint-vitest-rule-tester'
import { vineParser } from '../src'
import vineTemplateFormat from '../src/rules/format/format-vine-template'
import { expectSnapshot } from '../src/utils'

run({
  name: 'vue-vine/format-vine-template',
  recursive: false,
  verifyAfterFix: true,
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: vineParser,
  },
  rule: vineTemplateFormat,
  invalid: [
    {
      description: 'should correctly fix Vue Vine template - case 1',
      code: `
function TestComp() {
  return vine\`
<div>
      HelloWorld
  </div>
    <!-- TEST COMMENT -->
    <p
>Chaos</p>
    \`
}\n`.trim(),
      output(result) {
        expectSnapshot(result, `
 ┌───┬────────────────────────────────
 │ 1 │function TestComp() {
 │ 2 │  return vine\`
 │ 3 │    <div>HelloWorld</div>
 │ 4 │    <!-- TEST COMMENT -->
 │ 5 │    <p>Chaos</p>
 │ 6 │  \`
 │ 7 │}
 └───┴────────────────────────────────
            `)
      },
    }, // Case 1

    {
      description: 'should correctly fix Vue Vine template - case 2',
      code: `
function TestComp() {
  return vine\`
  <!-- This is a comment -->
\`
}\n`.trim(),
      output(result) {
        expectSnapshot(result, `
 ┌───┬────────────────────────────────
 │ 1 │function TestComp() {
 │ 2 │  return vine\`
 │ 3 │    <!-- This is a comment -->
 │ 4 │  \`
 │ 5 │}
 └───┴────────────────────────────────
            `)
      },
    }, // Case 2

    {
      description: 'should correctly fix Vue Vine template - case 3',
      code: `
function TestComp() {
  return vine\`
  <div>
    <MyComponent
      class="this-is-a-very-very-long-class-name-to-make-this-component-line-break-by-prettier"
    :foo="bar"
    @click="onClick"
  />
    <p
      style="color: red">
      Hello
    </p>
    </div>
\`
}\n`.trim(),
      output(result) {
        expectSnapshot(result, `
 ┌────┬────────────────────────────────
 │  1 │function TestComp() {
 │  2 │  return vine\`
 │  3 │    <div>
 │  4 │      <MyComponent
 │  5 │        class="this-is-a-very-very-long-class-name-to-make-this-component-line-break-by-prettier"
 │  6 │        :foo="bar"
 │  7 │        @click="onClick"
 │  8 │      />
 │  9 │      <p style="color: red">Hello</p>
 │ 10 │    </div>
 │ 11 │  \`
 │ 12 │}
 └────┴────────────────────────────────
            `)
      },
    }, // Case 3

    {
      description: 'should correctly fix Vue Vine template - case 4',
      code: `
function TestComp() {
  return vine\`
  <div>
    <p>111</p>
<!-- 222

333
-->
    <span>444</span>
  </div>
\`
}\n`.trim(),
      output(result) {
        expectSnapshot(result, `
 ┌────┬────────────────────────────────
 │  1 │function TestComp() {
 │  2 │  return vine\`
 │  3 │    <div>
 │  4 │      <p>111</p>
 │  5 │      <!-- 222
 │  6 │
 │  7 │333
 │  8 │-->
 │  9 │      <span>444</span>
 │ 10 │    </div>
 │ 11 │  \`
 │ 12 │}
 └────┴────────────────────────────────
            `)
      },
    }, // Case 4

    {
      description: 'should correctly fix Vue Vine template - case 5',
      code: `
function TestComp() {
  return vine\`
<div>
      <!-- <div
        :data-count="count"
        :data-type="type"
      /> -->
    </div>
  \`
}\n`.trim(),
      output(result) {
        expectSnapshot(result, `
 ┌────┬────────────────────────────────
 │  1 │function TestComp() {
 │  2 │  return vine\`
 │  3 │    <div>
 │  4 │      <!-- <div
 │  5 │        :data-count="count"
 │  6 │        :data-type="type"
 │  7 │      /> -->
 │  8 │    </div>
 │  9 │  \`
 │ 10 │}
 └────┴────────────────────────────────
      `)
      },
    }, // Case 5

    {
      description: 'should correctly process <pre> tag - case 6',
      code: `
function TestComp() {
  return vine\`<pre>
      HelloWorld
    </pre>
  \`
}\n`.trim(),
      output(result) {
        expectSnapshot(result, `
 ┌───┬────────────────────────────────
 │ 1 │function TestComp() {
 │ 2 │  return vine\`
 │ 3 │    <pre>
 │ 4 │      HelloWorld
 │ 5 │    </pre>
 │ 6 │  \`
 │ 7 │}
 └───┴────────────────────────────────
      `)
      },
    }, // Case 6
  ],
})
