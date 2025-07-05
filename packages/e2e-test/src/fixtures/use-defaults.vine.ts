import '../styles/atom.css'

interface LineProps {
  center?: boolean
}

function Line({ center = true }: LineProps) {
  return vine`
    <div class="row-flex items-center" :class="{ 'justify-center': center }">
      <slot />
    </div>
  `
}

export function TestUseDefaults() {
  return vine`
    <!-- No explicit given center, should be true by fallback to true as default -->
    <Line class="line-1">
      <p>Hello world</p>
    </Line>
    <!-- Explicit given center, should be true -->
    <Line class="line-2" center>
      <p>Hello world</p>
    </Line>
  `
}
