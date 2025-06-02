import { JsxComp } from '../components/mix-with-jsx/jsx-comp'

export function TestVineWithJsx() {
  return vine`
    <div
      class="h-full w-full px-5 py-10 flex flex-col justify-center items-center"
    >
      <h3>This is a test page for Vine and JSX</h3>
      <JsxComp name="John" :age="20" />
    </div>
  `
}
