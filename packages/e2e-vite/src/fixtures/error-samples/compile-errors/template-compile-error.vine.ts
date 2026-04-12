export function SampleOne() {
  const count = ref(0)
  const msg = ref('hello world')

  return vine`
    <div
      style="font-size: 15px"
      :style="{
        color: count > 5 ? 'red' : 'blue',
      }"
    >
      <p v-text="msg">Dida dida</p>
    </div>
  `
}

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
