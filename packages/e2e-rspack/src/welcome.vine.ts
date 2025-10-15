export function WelcomePage() {
  vineStyle.scoped(`
    .welcome-page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }
  `)

  return vine`
    <div class="welcome-page">
      <h2>Vue Vine + Rspack E2E Test</h2>
      <p>Welcome to the test application</p>
    </div>
  `
}
