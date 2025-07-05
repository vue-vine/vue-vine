import { TestCompOne } from './key-cases.vine'

export function DebugPage() {
  return vine`
    <div class="debug-page-container">
      <TestCompOne zee="helloworld" :foo="123" />
    </div>
  `
}
