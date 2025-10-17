import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import minLight from 'shiki/themes/min-light.mjs'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const vineGrammar = JSON.parse(
  readFileSync(join(__dirname, './vine-ts.tmLanguage.json'), 'utf-8'),
)
const vineRequiredLangs = [
  // 'vue-html',
  'css',
  'scss',
  'sass',
  'less',
  'stylus',
  'vue',
]

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
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap', rel: 'stylesheet' }],
    ['script', { 'defer': '', 'data-website-id': '5c1907e9-d51e-4b5b-a1cc-f05ece324544', 'src': 'https://stats.dokduk.cc/script.js' }],
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
            { text: '周边生态', link: '/zh/introduction/ecosystem' },
          ],
        },
        {
          text: '说明书',
          items: [
            { text: '总览', link: '/zh/specification/overview' },
            { text: 'Props', link: '/zh/specification/props' },
            { text: '宏函数', link: '/zh/specification/macros' },
            { text: 'Vibe', link: '/zh/specification/vibe' },
            { text: '附加功能', link: '/zh/specification/enhanced' },
          ],
        },
      ],
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Why Vine', link: '/introduction/why' },
            { text: 'Quick Start', link: '/introduction/quick-start' },
            { text: 'Ecosystem', link: '/introduction/ecosystem' },
          ],
        },
        {
          text: 'Specification',
          items: [
            { text: 'Overview', link: '/specification/overview' },
            { text: 'Props', link: '/specification/props' },
            { text: 'Macros', link: '/specification/macros' },
            { text: 'Vibe', link: '/specification/vibe' },
            { text: 'Enhanced Features', link: '/specification/enhanced' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vue-vine/vue-vine' },
    ],

    outline: {
      level: 'deep',
    },
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/introduction/quick-start' },
          {
            text: 'Playground',
            link: 'https://stackblitz.com/~/github.com/vue-vine/stackblitz-playground',
          },
        ],
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '指引', link: '/zh/introduction/quick-start' },
          {
            text: '演练场',
            link: 'https://stackblitz.com/~/github.com/vue-vine/stackblitz-playground',
          },
        ],
      },
    },
  },
  markdown: {
    theme: {
      light: {
        ...minLight,
        colorReplacements: {
          '#c2c3c5': '#ababab',
        },
      },
      dark: 'tokyo-night',
    },
    languages: [
      ...vineRequiredLangs,
      {
        embeddedLangs: [...vineRequiredLangs],
        ...vineGrammar,
      },
    ],
    config(md) {
      md.use(groupIconMdPlugin)
    },
  },
  vite: {
    plugins: [
      UnoCSS(),
      groupIconVitePlugin(),
    ],
  },
})
