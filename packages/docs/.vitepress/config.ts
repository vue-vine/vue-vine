import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Vue Vine',
  description: 'Another style to write Vue.',
  head: [
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicons/apple-touch-icon.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicons/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicons/favicon-16x16.png' }],
    ['link', { rel: 'shortcut icon', href: '/favicons/favicon.ico' }],
  ],
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          'zh-CN': {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guide', link: '/guide/get-started' },
    ],

    sidebar: [
      {
        text: 'Design',
        items: [
          { text: 'Why Vine', link: '/design/why' },
          { text: 'Specification', link: '/design/spec' },
          { text: 'Macros', link: '/design/macros' },
        ],
      },
      {
        text: 'Guide',
        items: [
          { text: 'Get Started', link: '/guide/get-started' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vue-vine/vue-vine' },
    ],
  },
  markdown: {
    languages: [
      {
        id: 'vue-vine',
        scopeName: 'source.vue-vine',
        path: join(
          __dirname,
          './vine-ts.tmLanguage.json',
        ),
        embeddedLangs: [
          'vue-html',
          'css',
          'scss',
          'sass',
          'less',
          'stylus',
        ],
      },
    ],
  },
})
