import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitepress'
import UnoCSS from 'unocss/vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const vineGrammar = JSON.parse(
  readFileSync(join(__dirname, './vine-ts.tmLanguage.json'), 'utf-8'),
)

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Vue Vine',
  description: 'Another style to write Vue.',
  head: [
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicons/apple-touch-icon.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicons/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicons/favicon-16x16.png' }],
    ['link', { rel: 'shortcut icon', href: '/favicons/favicon.ico' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'true' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&display=swap', rel: 'stylesheet' }],
  ],
  lang: 'en-US',
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
    ],

    sidebar: {
      '/zh': [
        {
          text: '介绍',
          items: [
            { text: 'Why Vine', link: '/zh/introduction/why' },
            { text: '快速开始', link: '/zh/introduction/quick-start' },
          ],
        },
        {
          text: '定义说明',
          items: [
            { text: '总览', link: '/zh/specification/overview' },
            { text: 'Props', link: '/zh/specification/props' },
            { text: '宏', link: '/zh/specification/macros' },
          ],
        },
      ],
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Why Vine', link: '/introduction/why' },
            { text: 'Quick Start', link: '/introduction/quick-start' },
          ],
        },
        {
          text: 'Specification',
          items: [
            { text: 'Overview', link: '/specification/overview' },
            { text: 'Props', link: '/specification/props' },
            { text: 'Macros', link: '/specification/macros' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vue-vine/vue-vine' },
    ],
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/introduction/quick-start' },
        ],
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '指引', link: '/zh/introduction/quick-start' },
        ],
      },
    },
  },
  markdown: {
    theme: {
      light: 'vitesse-light',
      dark: 'vitesse-dark',
    },
    languages: [
      {
        embeddedLangs: [
          'vue-html',
          'css',
          'scss',
          'sass',
          'less',
          'stylus',
        ],
        ...vineGrammar,
      },
    ],
  },
  vite: {
    plugins: [
      UnoCSS(),
    ],
  },
})
