export function Button() {
  const text = vineProp<string>(value => value.startsWith('#'))
  const handleClick = vineProp<() => void>()
  const buttonText = ref('')

  buttonText.value = text.value
  // eslint-disable-next-line unused-imports/no-unused-vars
  const clickCallback = () => {
    handleClick && handleClick.value && handleClick.value()
  }

  vineStyle.scoped(scss`
    .my-button {
      padding: 8px 20px;
      background-color: #4096ff;
      color: #fff;
      border-radius: 8px;
    }
  `)

  return vine`
    <div class="my-button" @click="clickCallback">
      <span>{{ buttonText }}</span>
    </div>
  `
}

export function Common() {
  const text = vineProp<string>(value => value.startsWith('#'))
  const handleClick = vineProp<() => void>()
  const buttonText = ref('')

  buttonText.value = text.value

  vineStyle.scoped(scss`
    .my-header {
      width: 100%;
      height: 80px;
      padding-left: 10%;
      padding-right: 10%;
      border-bottom: 1px solid rgb(214, 212, 212);
      position: fixed;
      top: 0px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  `)

  // eslint-disable-next-line unused-imports/no-unused-vars
  const clickFunc = () => {
    handleClick && handleClick.value && handleClick.value()
  }

  return vine`
    <div class="my-header">
      <h2>Test Website</h2>
      <Button :text="buttonText" :handleClick="clickFunc"></Button>
    </div>
  `
}
