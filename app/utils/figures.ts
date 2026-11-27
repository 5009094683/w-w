// How wide a figure is shown at each screen width, as HTML `sizes` values.
// The browser reads this before the page is laid out and picks the smallest
// image file that is sharp enough. The numbers follow the page grid in
// PageSection.vue (content is 9 of 12 columns from 1024px, capped at 880px);
// tests/e2e/images.spec.ts fails if they drift from what is rendered.
export const FIGURE_SIZES = {
  /** A figure as wide as the section content. */
  full: '(min-width: 1264px) 880px, (min-width: 1024px) calc(75vw - 70px), (min-width: 640px) calc(100vw - 4rem), calc(100vw - 2.5rem)',
  /** A figure in the screenshot grid: two to a row on phones, three from 768px. */
  grid: '(min-width: 1264px) 280px, (min-width: 1024px) calc(25vw - 37px), (min-width: 768px) calc(33.3vw - 35px), calc(50vw - 30px)',
} as const
