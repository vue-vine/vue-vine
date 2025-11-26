import type { Directive } from 'vue'
import { onMounted, ref, useTemplateRef, watchEffect } from 'vue'

const Foo = 123

// #region Fixures for ESLint show warns and errors in VSCode
function Comp() {
  const foo = vineProp<string>()

  return vine`
    <div>child comp - {{ foo }}</div>
  `
}

// - Case 1: 'vue-vine/format-vine-macros-leading'
// - Case 2: 'vue-vine/essentials-no-child-content'
export function SampleOne() {
  const count = ref(0)
  const msg = ref('hello world')

  const p1 = vineProp<string>()
  vineOptions({
    name: 'ESLintErrsSample',
  })

  return vine`
    <div
      style="font-size: 15px"
      :style="{
        color: count > 5 ? 'red' : 'blue',
      }"
    >
      <p v-text="msg">Dida dida</p>
      <Comp foo="111" :foo="'222'" />
    </div>
  `
}

// - Case 1: 'vue-vine/format-prefer-template' with autofix in setup
// - Case 2: 'vue-vine/format-prefer-template' not autofix in template
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

export function TestPlainTextTemplate() {
  // This should not report any formatting warning
  return vine`
    hello
  `
}

/**
 This needs to be configured in shims.d.ts with:
  declare module 'vue' {
    interface HTMLAttributes {
      border?: string
    }
  }
 */
export function TestUnoCssAttributeMode() {
  const vBounce: Directive<HTMLElement> = {
    mounted(el) {
      el.classList.add('bounce')
    },
  }

  return vine`
    <div v-bounce border="1px solid red">
      <span>foo</span>
    </div>
  `
}

// #endregion

// #region Fixtures for testing component reference & props check in VSCode
export function TestCompOne() {
  /** @description zee is a string! */
  const zee = vineProp<string>()
  const foo = vineProp.withDefault(0)

  const emits = vineEmits<{
    clickTest: [boolean]
  }>()

  return vine`
    <div @click="emits('clickTest', true)">This is Comp1</div>
    <p>foo: {{ foo }}</p>
  `
}

function TestCompTwo() {
  const bar = ref('123')

  return vine`
    <div>This is Comp2 - bar {{ bar }}</div>
    <UnknownComp />
    <!-- ^^^ It should reports error here -->
    <!-- due to unknown component 'UnknownComp' -->
    <TestCompOne />

    <!-- due to missing required prop 'zee' but not for 'foo' -->
  `
}
// #endregion

// #region Test vineExpose and component ref
function TargetComp(props: {
  foo: boolean
}) {
  const count = ref(0)

  const onClickCompOne = (foo: boolean) => {
    console.log('onClickCompOne: ', foo)
  }

  watchEffect(() => {
    console.log('count: ', count.value)
  })
  vineExpose({
    count,
  })

  return vine`
    <div @click="count++">Hello I'm target</div>
    <p>count: {{ count }}</p>
    <TestCompOne zee="123" :foo="456" @clickTest="onClickCompOne" />
  `
}

export function TestCompRef() {
  const target = useTemplateRef('target')

  console.log('target count: ', target.value?.count)

  return vine`
    <div>
      <TargetComp ref="target" !foo />
    </div>
  `
}
// #endregion

// #region Test ESLint rule: no-v-for-key-on-child
export function TestNoVforKeyOnChild() {
  interface User { id: string, name: string }
  const users = ref<User[]>([])
  return vine`
    <div class="user-list">
      <template v-for="user in users">
        <div :key="user.id">
          {{ user.name }}
        </div>
      </template>
    </div>
  `
}
// #endregion

// #region Test ESLint rule: no-lifecycle-hook-after-await
declare const doSomethingAsync: () => Promise<void>
export async function TestNoLifecycleHookAfterAwait() {
  await doSomethingAsync()

  onMounted(() => {
    // ...
  })

  return vine`
    <p>...</p>
  `
}
// #endregion

// #region Test generics on Vine component function

export function TestGenericComp1<T extends keyof HTMLElementTagNameMap = 'h1'>(
  props: Partial<HTMLElementTagNameMap[T]> & { as: T },
) {
  return vine`
    <component :is="as" />
  `
}

// #endregion
