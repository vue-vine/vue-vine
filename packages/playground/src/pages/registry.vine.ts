import { useRouter } from 'vue-router'
import { Common } from '../components/common.vine'

export function Registry() {
  const router = useRouter()

  const handleClick = () => {
    router.back()
  }

  return vine`
    <Common text="return" :handleClick="handleClick"></Common> 
    <div>
      <h2>registry page</h2>
    </div> 
  `
}
