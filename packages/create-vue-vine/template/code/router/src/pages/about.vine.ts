export default function About() {
  vineStyle.scoped(`
    .container {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `)

  return vine`
    <div class="container">Enjoy~</div>
  `
}
