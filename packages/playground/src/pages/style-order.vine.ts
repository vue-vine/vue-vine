import { PageHeader } from '../components/page-header.vine'

function Child() {
  vineStyle(`
    .test {
      color: blue;
    }
  `)

  return vine`<div class="test">Child</div>`
}

export function StyleOrder() {
  vineStyle(css`
    .test {
      color: red;
    }
  `)

  return vine`
    <PageHeader />
    <main class="test">
      <h2>Test style order</h2>
      <Child />
    </main>
  `
}
