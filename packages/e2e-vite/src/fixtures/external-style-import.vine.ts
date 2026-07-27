function ScopedImportExternalStyle() {
  vineStyle.import.scoped('../styles/e2e.css')

  return vine`
    <div class="child-comp">
      <p class="test-me">Inside: should be red</p>
    </div>
  `
}

export function TestExternalStyleImport() {
  return vine`
    <div class="container">
      <p class="test-me">Outside: should not be red</p>
      <ScopedImportExternalStyle />
    </div>
  `
}
