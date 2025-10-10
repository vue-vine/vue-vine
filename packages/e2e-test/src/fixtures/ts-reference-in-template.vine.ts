export function TestTsReferenceInTemplate() {
  const foo = (_some: string) => { }
  function functionFoo(_some: string) {}

  function work() { }
  function work2() { }

  function error() {}

  return vine`
    <div class="max-w-screen-lg mx-auto h-full px-12 py-24">
      <!-- ⬇️ Access a function, but eslint throw define but never used -->
      <textarea @input="(e: Event) => foo((e.target as HTMLTextAreaElement).value)" />
      <textarea @input="(e: Event) => functionFoo((e.target as HTMLTextAreaElement).value)" />

      <!-- ✅ Seems only work expectedly with event like @click -->
      <button @click="work" />
      <!-- ✅ Also work for simple arrow function -->
      <button @click="() => work2()" />
      <!-- ❌ Do not work with param -->
      <button @click="(_e: any) => error()" />
    </div>
  `
}
