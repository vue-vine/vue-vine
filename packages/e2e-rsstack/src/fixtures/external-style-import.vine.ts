function ScopedImportExternalStyle() {
  vineStyle.import.scoped('../styles/e2e.css')

  return vine`
    <div class="child-comp">
      <p class="test-me">Inside - should be red</p>
    </div>
  `
}

export function TestExternalStyleImport() {
  vineStyle(`
    .container {
      padding: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .test-me {
      padding: 0.5rem;
      margin: 1rem 0;
      border: 2px solid #ccc;
      border-radius: 4px;
    }
  `)

  return vine`
    <div class="container">
      <h2>External Style Import Test</h2>
      <p class="test-me">Outside - should not be red</p>
      <ScopedImportExternalStyle />
    </div>
  `
}
