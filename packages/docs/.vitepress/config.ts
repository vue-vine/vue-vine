import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Vue Vine',
  description: 'Another style to write Vue.',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'The Why', link: '/guide/the-why' },
          { text: 'Get Started', link: '/guide/get-started' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vue-vine/vue-vine' },
    ],
  },
})
