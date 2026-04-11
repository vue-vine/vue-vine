import { TestCompOne } from './generic-type-in-vine-comp.vine'

export function DebugPage() {
  return vine`
    <div class="debug-page-container">
      <TestCompOne zee="helloworld" :foo="123" />
    </div>
  `
}
