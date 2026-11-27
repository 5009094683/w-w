// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      // Markdown from content/ is rendered to HTML at build time and is trusted.
      'vue/no-v-html': 'off',
    },
  },
  {
    ignores: ['.output/**', '.wrangler/**', '.vercel/**', 'playwright-report/**', 'test-results/**'],
  },
)
