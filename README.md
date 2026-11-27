# YBX Labs website

The source of [ybxlabs.com](https://ybxlabs.com), version 2.

Everything a visitor reads lives in this repository as Markdown and YAML. When the site is built, every content page becomes a finished HTML file with its styles inside it and no JavaScript, together with a Markdown copy for AI crawlers. Cloudflare serves those files directly. A small Worker handles only what cannot be prepared in advance: the payment pages, the payment and contact APIs, a few redirects and the "not found" page.

- [Quick start](#quick-start)
- [Commands](#commands)
- [Where things are](#where-things-are)
- [Editing content](#editing-content)
- [Settings](#settings)
- [Checks](#checks)
- [Deploying](#deploying)
- [Search engines and AI crawlers](#search-engines-and-ai-crawlers)
- [How it is built](#how-it-is-built)

## Quick start

You need npm and Node.js 22 (22.22.3 or newer) or 24 (24.15 or newer).

```bash
npm install
npm run dev
```

The site opens at http://localhost:3000 and reloads when you change content or code. In development the security check on the forms is skipped. Without keys, the contact form and the payment pages answer "not configured"; nothing is sent or charged.

To run the site the way Cloudflare runs it:

```bash
cp .dev.vars.example .dev.vars
TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build:cloudflare
npm run preview
```

That serves the built site at http://localhost:8787 on the Workers runtime. The key above is Cloudflare's public test key, which always passes.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with live reload |
| `npm run build:cloudflare` | Production build for Cloudflare Workers, into `.output/` |
| `npm run build:staging` | The same build marked as staging: hidden from search engines, deployed as a separate Worker. Needs `NUXT_SITE_URL` |
| `npm run preview` | Serves the last Cloudflare build locally on the Workers runtime |
| `npm run deploy` | Uploads the last Cloudflare build (`wrangler deploy`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript and Vue type check |
| `npm test` | Unit tests |
| `npm run check:site` | Checks every page of the last Cloudflare build |
| `npm run test:worker` | Starts the last Cloudflare build locally and checks it over HTTP |
| `npm run smoke -- https://example.com` | Runs the same HTTP checks against a deployed site |
| `npm run test:e2e` | Builds the site for Node and runs the browser and accessibility tests |
| `npm run indexnow` | Tells Bing and other IndexNow search engines which pages changed |

`npm run build` makes a build for whatever host it runs on (on Vercel, a Vercel build). The site is meant to run on Cloudflare; the other targets exist so the branch can still be previewed elsewhere.

## Where things are

```
content/            everything the visitor reads
  site.yaml         company facts, used on every page and in the structured data
  pages/            home, the services and products overviews, about, careers,
                    contact, pricing, questions, glossary
  services/         one file per service
  products/         one file per product
  careers/          one file per job
  legal/            privacy policy, terms and refund policy, word for word
  images/           master pictures; the build makes every size and format
app/                pages, components and styles
server/             the payment and contact APIs, which run in the Worker
shared/             currency arithmetic used by the pages and the server
modules/content/    reads and checks content/ at build time and prepares pictures
scripts/            build checks, the HTTP smoke test, IndexNow, the Prismic export
tests/              unit tests and browser tests
public/             files served exactly as they are: icons, the Apple Pay domain file
```

## Editing content

Each file starts with a block of fields between two `---` lines, followed by the text in Markdown. Change a file, save, and the development server shows the result.

A mistake cannot reach the live site unnoticed: the build stops and names the file and the field. That covers a missing or misspelled field, a wrong date, a link to a page that does not exist, a picture without a description and a picture file that is missing.

### Rules for every page

| Field | Rule |
| --- | --- |
| `title` | 3 to 70 characters. Shown in the browser tab and as the search result title. |
| `description` | 50 to 400 characters; search engines show about 160. The search result text. |
| `updatedAt` | A date as `YYYY-MM-DD`. **Change it whenever you change the page.** It becomes the page's last-modified date in the sitemap and tells search engines to look again. |
| `summary` | Services, products and jobs only. One plain, factual statement of what the thing is. This text is what search engines and AI assistants are given in the structured data and in `llms.txt`, so keep anything you cannot prove out of it. |

In the text, start sections with `## `. A top-level `# ` heading is refused, because the page heading comes from the fields. Links to other pages start with `/`, for example `[pricing](/pricing)`.

### Only publish what is true

Search engines and AI assistants repeat what the site says about the company. Numbers, certifications, client names and comparisons with competitors belong on the site only if they can be backed up. Each content file begins with a comment that says which parts were taken from the previous site and which are new wording to review.

### Company facts

`content/site.yaml` holds the name, registration number, address, phone, email, social links and the menu. Every page reads them from there, and so does the structured data, so a fact is corrected in one place.

### Adding or removing a page

- **A service, product or job:** add a file in `content/services/`, `content/products/` or `content/careers/`. The file name becomes the address (`content/services/data-engineering.md` is published at `/services/data-engineering`). Copy an existing file as a starting point. `order` sets its position in lists and `code` its label (`S-07`, `P-04`).
- **Removing a published page:** delete its file, then add a redirect for its old address under `routeRules` in `nuxt.config.ts`, next to the existing ones, so links to it keep working.
- The footer, sitemap, `llms.txt` and overview pages update themselves. The menu at the top lists sections, not single pages; it is set in `content/site.yaml`.

### Pictures

Put a PNG or JPEG in `content/images/` (letters, digits, hyphens and underscores in the name) and list it under `figures` in a product file:

```yaml
figures:
  - src: products/flavorgpt/chat.png
    alt: FlavorGPT start screen with a chat history sidebar and a prompt box.
    caption: The chat workspace.
```

`alt` is required: it is what screen readers and search engines get in place of the picture. Use the largest master you have. The build saves each picture as AVIF and WebP at several widths up to 1760 pixels, and browsers download the smallest one that is sharp enough for the screen. Replacing a picture gives it a new address, so no visitor sees a stale copy.

### Questions and answers

Questions on a page are also published as structured data, which search engines may show as rich results. Add `structured: false` to a question to keep it on the page but out of that data. Use it for any answer that makes a claim you cannot prove.

### Jobs

A job page always shows. Google's job listings only accept a job that states when it was posted, when it closes and where applicants may be, so the job structured data is published only when a job file has all three:

```yaml
datePosted: 2026-11-01
validThrough: 2027-01-31
applicantCountries: [India]
```

Remove a job's file when the role is filled.

### Legal pages

The three files in `content/legal/` hold the texts exactly as published. Change the wording only when the policy itself changes, and update `effectiveDate` and `updatedAt` when it does.

## Settings

Nothing secret is stored in this repository. Settings are read from the environment under the names below; every name is also accepted with a `NUXT_` prefix, as on the previous site.

### When building

| Name | Purpose |
| --- | --- |
| `TURNSTILE_SITE_KEY` | The public Cloudflare Turnstile site key. It is needed at build time because the contact page is built in advance. Without it the contact form tells visitors to use email instead. |
| `NUXT_SITE_URL` | The address the site is built for. Leave it unset for production (`https://ybxlabs.com`). |
| `NUXT_SITE_ENV` | Set to `staging` to hide the build from search engines and name the Worker `ybxlabs-website-staging`. `npm run build:staging` sets it. |

### When running

These are set on the Worker as secrets (`npx wrangler secret put NAME`, or in the Cloudflare dashboard under the Worker's settings). A feature without its settings answers "not configured" and does nothing else.

| Feature | Names |
| --- | --- |
| Security check on the forms | `TURNSTILE_SECRET_KEY` |
| Contact form | `RESEND_API_KEY`, and optionally `CONTACT_EMAIL_TO` (default `hello@ybxlabs.com`) and `CONTACT_EMAIL_FROM` (default `website@ybxlabs.com`) |
| Razorpay | `RAZORPAY_IS_SANDBOX`, then `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for live payments, or `RAZORPAY_TEST_KEY_ID` and `RAZORPAY_TEST_KEY_SECRET` when the sandbox flag is `true` |
| PhonePe | `PHONEPE_CLIENT_ID`, `PHONEPE_API_KEY`, optionally `PHONEPE_CLIENT_VERSION` (default `1`) |
| Zoho Payments | `ZOHO_ACCOUNT_ID`, `ZOHO_API_KEY`, `ZOHO_SIGN_KEY`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, optionally `ZOHO_IS_SANDBOX` |

Two things differ from the previous site:

- **The security check is always required outside `npm run dev`.** If `TURNSTILE_SECRET_KEY` is missing, the forms refuse to work instead of working unprotected.
- **Zoho Payments needs `ZOHO_SIGN_KEY`.** Every payment result is checked against its signature, so Zoho stays switched off until the signing key is set.

For local previews, `.dev.vars` holds the same names. Copy `.dev.vars.example`; the file is ignored by git.

## Checks

| Check | What it covers |
| --- | --- |
| `npm test` | The payment and contact APIs with every outside service answered locally, currency arithmetic, the content rules and the picture pipeline |
| `npm run check:site` | Every built page: one heading, title, description, canonical address, share image, valid structured data, picture descriptions and sizes, working links, a Markdown copy, no scripts on content pages. Also the sitemap, `robots.txt`, `llms.txt`, redirects and Cloudflare's limits |
| `npm run test:worker` | The built Worker over HTTP: status codes, redirects, headers, pictures, the Apple Pay file and the API's refusals |
| `npm run test:e2e` | A real browser: every page type on desktop and phone screens, the menu without JavaScript, dark mode, pictures, the contact form, each payment gateway from start to receipt, and accessibility rules (WCAG A and AA) in light and dark |

No test makes a payment or sends an email. The outside services are answered by `tests/e2e/support/mock-gateways.mjs`.

GitHub Actions runs all of them on every pull request (`.github/workflows/ci.yml`).

## Deploying

Deploys need a Cloudflare login (`npx wrangler login`) or the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables.

### Staging

Staging is a separate Worker on a `workers.dev` address. It tells search engines not to index it.

```bash
NUXT_SITE_URL=https://ybxlabs-website-staging.<your-subdomain>.workers.dev \
TURNSTILE_SITE_KEY=<site key> \
npm run build:staging
npm run deploy
npm run smoke -- https://ybxlabs-website-staging.<your-subdomain>.workers.dev
```

### Production

```bash
TURNSTILE_SITE_KEY=<site key> npm run build:cloudflare
npm run check:site
npm run deploy
npm run smoke -- https://ybxlabs.com
npm run indexnow
```

Secrets set on the Worker stay in place across deploys.

### Moving ybxlabs.com to this site for the first time

Today ybxlabs.com passes through Cloudflare to the previous site. The domain is managed in a Cloudflare account, and the Worker has to be deployed in that same account for the domain to be attached to it.

1. In that account, deploy the Worker (the production commands above, up to `npm run deploy`). It is now reachable on its `workers.dev` address only.
2. Add the settings from the table above as secrets on the Worker, using the live keys from the present host.
3. Run `npm run smoke -- https://<worker>.workers.dev` and try the contact form and one payment there. If the Turnstile widget is limited to certain hostnames, add the `workers.dev` name for this test.
4. In the Cloudflare dashboard, turn off two settings on the ybxlabs.com domain. Both are on today, and both rewrite pages on their way to the visitor:
   - **Rocket Loader** changes how scripts load. The site ships almost no scripts, so it has nothing to speed up, and it can interfere with the contact and payment pages.
   - **Email Address Obfuscation** replaces the contact address in the page with a script. Search engines and AI assistants then cannot read the address.
5. Decide about **Web Analytics**, which is also on today and adds its script to every page. Leaving it on is fine; pages are then no longer free of scripts.
6. Check that Cloudflare is not set to block AI crawlers on the domain, unless that is what you want. `robots.txt` on this site welcomes them; the two should agree.
7. Open the Worker, go to **Settings**, **Domains & Routes**, **Add**, **Custom Domain** and enter `ybxlabs.com`. Cloudflare points the domain at the Worker and issues the certificate. If it refuses because a DNS record for the name already exists, delete that record and add the domain again. From this moment the new site is live.
8. Make `www.ybxlabs.com` redirect to `ybxlabs.com` with a Redirect Rule (Cloudflare has a ready-made "redirect from WWW to root" rule). Today the `www` name serves a second copy of the site.
9. Run `npm run smoke -- https://ybxlabs.com`. It checks the pages, redirects, headers and pictures, and it fails if steps 4 or 8 were missed.
10. In Google Search Console and Bing Webmaster Tools, submit `https://ybxlabs.com/sitemap.xml`. The previous site had no sitemap. Then run `npm run indexnow`.

Addresses do not change, so the payment gateways, Turnstile and Resend should need no changes. One thing to check: if a gateway account only accepts calls from listed server addresses, that list needs updating, because the Worker calls the gateways from Cloudflare's network. Three old page addresses moved and redirect permanently: `/services/flavorai`, `/services/flavorai-api` and `/services/web3.0`.

**Going back:** remove the Custom Domain from the Worker and restore the DNS record that pointed to the previous host. The previous site is untouched by any of this.

## Search engines and AI crawlers

The build produces, with no extra work:

- a canonical address, description, share image and last-modified date on every page
- structured data: the organization, the website, each page with its breadcrumbs, services, products with their screenshots, questions and answers, glossary terms, and job listings when a job has its dates
- `sitemap.xml` with each page's last-modified date and pictures
- `robots.txt`
- `llms.txt`, an index of every page with a factual summary, and `llms-full.txt`, the whole site as text
- a Markdown copy of every page at the same address with `.md` added (`/about-us.md`; the home page is `/index.md`)

Two switches at the top of `nuxt.config.ts` set the policy for AI crawlers:

- `aiCrawlers`: `'allow'` lets the named AI crawlers fetch the site, `'block'` turns them away in `robots.txt`.
- `allowAiTraining`: the stated preference about using the content to train models. Search and AI answers stay allowed either way.

Nobody can promise a position in search results. What the site controls is that every page is fast, readable without scripts, described accurately and easy for crawlers to find and quote.

## How it is built

- **Nuxt 4 on Cloudflare Workers.** `npm run build:cloudflare` writes the static files to `.output/public` and the Worker to `.output/server`. `wrangler.jsonc` is the source of the Worker's configuration.
- **No scripts by default.** A route rule in `nuxt.config.ts` removes JavaScript from every page. `/contact-us` and `/payment` opt back in. Menus, the phone menu and dark mode work with HTML and CSS alone.
- **Content.** `modules/content` reads `content/` when the build starts, checks it against `modules/content/schema.ts` and hands it to the pages as typed modules (`import { services } from '#content/services'`). There is no database and no request to a content service when a page is viewed.
- **Pictures.** `modules/content/images.ts` resizes and converts the masters. Encoded files are kept in `node_modules/.cache`, so only new or changed pictures cost build time.
- **Payments.** `server/api/payment/create-order.post.ts` and `verify.post.ts` are the only payment routes. Gateway keys and tokens never leave the server. A result reported by the browser is never trusted on its own: Razorpay and Zoho results must carry a valid signature, and every payment is looked up on the gateway from the server. Amounts are converted with each currency's own number of decimals (`shared/utils/currency.ts`).
- **Redirects.** Redirects are listed under `routeRules` in `nuxt.config.ts`. The Cloudflare build also writes a `_redirects` file, so Cloudflare answers them, and the trailing-slash form of every page, without starting the Worker.
