function ScopedImportExternalStyle() {
  vineStyle.import('./styles/e2e.css').scoped()

  return vine`
    <div class="child-comp">
      <p class="test-me">Inside</p>
    </div>
  `
}

export function TestExternalStyleImport() {
  return vine`
    <div class="container">
      <p class="test-me">Outside</p>
      <ScopedImportExternalStyle />
    </div>
  `
}