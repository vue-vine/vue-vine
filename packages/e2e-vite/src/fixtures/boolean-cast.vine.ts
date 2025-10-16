function MyComp(props: {
  aaa: boolean
  bbb: string | boolean
  ccc: boolean | string
}) {
  return vine`
    <div>
      <div class="aaa">aaa = {{ aaa }} ({{ typeof aaa }})</div>
      <div class="bbb">bbb = {{ bbb }} ({{ typeof bbb }})</div>
      <div class="ccc">ccc = {{ ccc }} ({{ typeof ccc }})</div>
    </div>
  `
}

export function TestBoolCastPage() {
  return vine`
    <div class="flex flex-col">
      <MyComp class="positive" aaa bbb ccc />
      <MyComp class="negative" !aaa !bbb !ccc />
    </div>
  `
}
