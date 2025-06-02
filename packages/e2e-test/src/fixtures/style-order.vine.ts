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

  return vine`
    <main class="test-style-order">
      <h2 class="test">Outside: should be red</h2>
      <ChildComp />
    </main>
  `
}
