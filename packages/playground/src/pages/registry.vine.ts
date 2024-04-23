import { useRouter } from 'vue-router'
import { Common } from '../components/common.vine'

export function Registry() {
  const router = useRouter()

  const handleClick = () => {
    router.back()
  }

  return vine`
    <Common text="返回" :handleClick="handleClick"></Common> 
    <div>
      <h2>注册页面</h2>
    </div> 
  `
}
