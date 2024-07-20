import { PageHeader } from '../components/page-header.vine'

function Child() {
  vineStyle(`
    .test {
      color: blue;
    }
  `)

  return vine`<div class="test">Child wants blue</div>`
}

export function StyleOrder() {
  vineStyle(css`
    .test {
      color: red;
    }
    .sfc-playground-link {
      color: white;
      text-decoration: none;
    }
    .sfc-playground-link:hover {
      text-decoration: underline;
    }
  `)

  return vine`
    <PageHeader />
    <main class="test">
      <h2>Test style order</h2>
      <Child />
    </main>
    <br>
    <a
      class="sfc-playground-link"
      href="https://play.vuejs.org/#eNqNUsFOwzAM/ZUol12m9gCnUZBg2gEOgIBjLiX1uow0ieJkDE39d5x0KwPBxC2237Of87zj184Vmwh8xiuUXrnAEEJ0TNemvRQ8oOBXwqjOWR/YfKV0w5bedmxSlDlK5MmFMFU50AlMQYDO6ToARYxVjdowqWvE1BAwUEsaW5WUHwBD35KCqjyiUojhQ6dnkXhsl9DSautnzENDY/s8eQ/iU9IrrVmqtlijNbRUZggubeeUBv/ggrKGdpoNvVKt1tq+3+Vc8BGmh7xcgXz7Jb/GbcoJ/ugBwW9A8LEWat8C7ZfKi+d72NJ7LHa2iZrQJ4pPgFbHpHGA3UTTkOwjXFZ7m+1Qpn3BxTaAwcNSSWhC9hkvOJkzP7H6l9yz4jzz6EfpF0dn81n8acGrjvDTg/+YP4zPQzJkfwjfvOf9JzZ13zc="
    >
      Check equivalent Vue SFC playground example
    </a>
  `
}
