/** Checkout overlay + Razorpay/Zoho backdrop styling (payment page bg image). */

/** Same image as the payment page (`public/assets/payment-bg.png`). */
export const PAYMENT_CHECKOUT_BG_IMAGE = '/assets/payment-bg.png'

export const PAYMENT_CHECKOUT_THEME = {
  accent: '#3B82F6',
  /** Transparent so Razorpay does not paint a solid layer over our image. */
  backdrop: 'rgba(11, 27, 58, 0)'
} as const

const CHECKOUT_BACKDROP_ID = 'ybx-payment-checkout-backdrop'
const CHECKOUT_BACKDROP_STYLE_ID = 'ybx-payment-checkout-backdrop-style'
const CHECKOUT_BACKDROP_IMAGE_CLASS = 'ybx-checkout-backdrop-image'
const CHECKOUT_BACKDROP_OVERLAY_CLASS = 'ybx-checkout-backdrop-overlay'

/** Matches payment page: cover image + 50% dark overlay. */
const GATEWAY_BACKDROP_BG_IMAGE = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("${PAYMENT_CHECKOUT_BG_IMAGE}")`

const GATEWAY_BACKDROP_INLINE: Partial<CSSStyleDeclaration> = {
  backgroundColor: 'transparent',
  backgroundImage: GATEWAY_BACKDROP_BG_IMAGE,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
}

const ZOHO_BACKDROP_EXTRA_INLINE: Partial<CSSStyleDeclaration> = {
  opacity: '1'
}

const GATEWAY_BACKDROP_SELECTORS = [
  '.razorpay-backdrop',
  '[class*="razorpay-backdrop"]',
  '#zpay-backdrop',
  '[id="zpay-backdrop"]'
].join(', ')

let backdropHideTimer: ReturnType<typeof setTimeout> | null = null
let backdropDomObserver: MutationObserver | null = null
let backdropStyleEnforcerTimer: ReturnType<typeof setInterval> | null = null
let previousHtmlColorScheme: string | null = null
let previousBodyColorScheme: string | null = null

function applyGatewayBackdropInlineStyles(root: ParentNode = document) {
  if (typeof document === 'undefined') return

  root.querySelectorAll<HTMLElement>(GATEWAY_BACKDROP_SELECTORS).forEach((el) => {
    const isZoho = el.id === 'zpay-backdrop' || el.className.includes('zpay')
    Object.assign(el.style, GATEWAY_BACKDROP_INLINE, isZoho ? ZOHO_BACKDROP_EXTRA_INLINE : {})
  })
}

function startGatewayBackdropObserver() {
  if (typeof document === 'undefined' || backdropDomObserver) return

  applyGatewayBackdropInlineStyles()

  backdropDomObserver = new MutationObserver(() => {
    applyGatewayBackdropInlineStyles()
  })
  backdropDomObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  })

  // Zoho sets opacity on a timer after inject; re-apply briefly so our styles win.
  if (backdropStyleEnforcerTimer) clearInterval(backdropStyleEnforcerTimer)
  backdropStyleEnforcerTimer = setInterval(applyGatewayBackdropInlineStyles, 100)
  setTimeout(() => {
    if (backdropStyleEnforcerTimer) {
      clearInterval(backdropStyleEnforcerTimer)
      backdropStyleEnforcerTimer = null
    }
  }, 2500)
}

function stopGatewayBackdropObserver() {
  backdropDomObserver?.disconnect()
  backdropDomObserver = null
  if (backdropStyleEnforcerTimer) {
    clearInterval(backdropStyleEnforcerTimer)
    backdropStyleEnforcerTimer = null
  }
}

function ensureCheckoutBackdropStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(CHECKOUT_BACKDROP_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = CHECKOUT_BACKDROP_STYLE_ID
  style.textContent = `
    @keyframes ybxCheckoutBackdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes ybxCheckoutBackdropFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    #${CHECKOUT_BACKDROP_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483600;
      pointer-events: none;
      overflow: hidden;
      animation: ybxCheckoutBackdropFadeIn 180ms ease-out forwards;
    }
    #${CHECKOUT_BACKDROP_ID} .${CHECKOUT_BACKDROP_IMAGE_CLASS} {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
    #${CHECKOUT_BACKDROP_ID} .${CHECKOUT_BACKDROP_OVERLAY_CLASS} {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }

    .razorpay-container,
    .razorpay-container *,
    [class*="razorpay"],
    iframe[src*="checkout.razorpay.com"] {
      color-scheme: light !important;
    }

    .razorpay-backdrop,
    [class*="razorpay-backdrop"],
    div[class*="razorpay-backdrop"],
    #zpay-backdrop {
      background-color: transparent !important;
      background-image: ${GATEWAY_BACKDROP_BG_IMAGE} !important;
      background-size: cover !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
    }

    #zpay-backdrop {
      opacity: 1 !important;
    }

    #zpay-wrapper,
    [id="zpay-wrapper"] {
      color-scheme: light !important;
    }

    [class*="zpay"],
    [id*="zpay"],
    [class*="zoho-pay"],
    iframe[src*="zoho"],
    iframe[src*="zpay"] {
      color-scheme: light !important;
    }
  `
  document.head.appendChild(style)
}

function forceCheckoutColorSchemeLight() {
  if (typeof document === 'undefined') return
  if (previousHtmlColorScheme === null) {
    previousHtmlColorScheme = document.documentElement.style.colorScheme || ''
  }
  if (previousBodyColorScheme === null) {
    previousBodyColorScheme = document.body.style.colorScheme || ''
  }
  document.documentElement.style.colorScheme = 'light'
  document.body.style.colorScheme = 'light'
}

function restoreCheckoutColorScheme() {
  if (typeof document === 'undefined') return
  if (previousHtmlColorScheme !== null) {
    document.documentElement.style.colorScheme = previousHtmlColorScheme
    previousHtmlColorScheme = null
  }
  if (previousBodyColorScheme !== null) {
    document.body.style.colorScheme = previousBodyColorScheme
    previousBodyColorScheme = null
  }
}

export function showPaymentCheckoutBackdrop() {
  if (typeof document === 'undefined') return
  ensureCheckoutBackdropStyles()
  forceCheckoutColorSchemeLight()
  startGatewayBackdropObserver()

  const existing = document.getElementById(CHECKOUT_BACKDROP_ID)
  if (existing) return

  const backdrop = document.createElement('div')
  backdrop.id = CHECKOUT_BACKDROP_ID

  const img = document.createElement('img')
  img.className = CHECKOUT_BACKDROP_IMAGE_CLASS
  img.src = PAYMENT_CHECKOUT_BG_IMAGE
  img.alt = ''
  img.setAttribute('aria-hidden', 'true')
  img.decoding = 'async'

  const overlay = document.createElement('div')
  overlay.className = CHECKOUT_BACKDROP_OVERLAY_CLASS

  backdrop.append(img, overlay)
  document.body.appendChild(backdrop)
}

export function hidePaymentCheckoutBackdrop() {
  if (typeof document === 'undefined') return
  stopGatewayBackdropObserver()

  if (backdropHideTimer) {
    clearTimeout(backdropHideTimer)
    backdropHideTimer = null
  }

  const backdrop = document.getElementById(CHECKOUT_BACKDROP_ID)
  if (!backdrop) {
    restoreCheckoutColorScheme()
    return
  }

  backdrop.style.animation = 'ybxCheckoutBackdropFadeOut 250ms ease-in forwards'
  backdropHideTimer = setTimeout(() => {
    backdrop.remove()
    restoreCheckoutColorScheme()
    backdropHideTimer = null
  }, 260)
}

export function getRazorpayCheckoutTheme() {
  return {
    color: PAYMENT_CHECKOUT_THEME.accent,
    backdrop_color: PAYMENT_CHECKOUT_THEME.backdrop
  }
}
