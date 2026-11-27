// Nuxt names itself in an X-Powered-By header on every page it renders.
// Nothing needs it, and it tells strangers what the site runs on.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    removeResponseHeader(event, 'x-powered-by')
  })
})
