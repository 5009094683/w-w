import { routes } from '#content/routes'

// Page addresses are lower case and have no trailing slash. A request reaches
// the server only when no prebuilt file matches it, so a page asked for in
// another spelling (/About-Us, /about-us/) lands here and is sent, for good,
// to the address it is published at.
const pages = new Set(routes.map(route => route.path))

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const published = url.pathname.toLowerCase().replace(/\/+$/u, '') || '/'

  if (published !== url.pathname && pages.has(published)) {
    return sendRedirect(event, published + url.search, 301)
  }
})
