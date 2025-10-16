function ChildComp() {
  vineStyle(`
    .test {
      color: blue;
    }
  `)

  return vine`
    <div class="child-comp">
      <span class="test">Inner: should be red too.</span>
    </div>
  `
}

export function TestStyleOrder() {
  vineStyle(css`
    .test {
      color: red;
    }
  `)

  vineStyle(`
    .test-style-order {
      padding: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }
  `)

  return vine`
    <main class="test-style-order">
      <h2>Style Order Test</h2>
      <h3 class="test">Outside: should be red</h3>
      <ChildComp />
    </main>
  `
}

