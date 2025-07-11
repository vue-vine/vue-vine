import { onMounted, ref } from 'vue'

export const messages = {
  'en-US': {
    'recommended-collocation': 'Recommended collocation for Vue Vine',
    'sponsors': 'Sponsors',
  },
  'zh-CN': {
    'recommended-collocation': 'Vue Vine 推荐搭配',
    'sponsors': '赞助者',
  },
} as const

export function useI18n() {
  const locale = ref<keyof typeof messages>('en-US')

  const t = (key: keyof typeof messages['en-US']) => {
    return messages[locale.value][key]
  }

  onMounted(() => {
    locale.value = document.documentElement.lang as keyof typeof messages
  })

  return {
    locale,
    t,
  }
}
