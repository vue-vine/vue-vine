// - Case 1: 'vue-vine/format-prefer-template' with autofix in setup
// - Case 2: 'vue-vine/format-prefer-template' not autofix in template
const Foo = 222

export function SampleTwo() {
  let count = ref('0x' + Foo + 'CAFE')
  let type = ref('primary')

  return vine`
    <div :class="['btn', 'btn' + type]">
      <span>{{ count }}</span>
      <!-- <div
        :data-count="count"
        :data-type="type"
      /> -->
    </div>
  `
}
