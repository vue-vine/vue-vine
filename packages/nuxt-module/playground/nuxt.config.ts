export default defineNuxtConfig({
  // ssr: false, // disabled ssr
  routeRules: {
    '/': { ssr: false },
  },
  modules: ['../src/module'],
  vueVineNuxtModule: {},
  devtools: { enabled: true },
  compatibilityDate: '2024-08-01',
})
