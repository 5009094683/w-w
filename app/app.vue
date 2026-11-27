<script setup lang="ts">
import { site } from '#content/site'

useSeoMeta({
  twitterCard: 'summary_large_image',
})

const { absolute } = useAbsoluteUrl()

// The organization behind the site, built only from the published facts in
// content/site.yaml. Every page's structured data points back to it.
useSchemaOrg([
  defineOrganization({
    name: site.name,
    alternateName: site.formerName,
    description: site.description,
    logo: '/logo.png',
    email: site.contact.email,
    telephone: site.contact.phone,
    address: {
      streetAddress: `C/O ${site.address.careOf}, ${site.address.street}`,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.countryCode,
    },
    sameAs: site.social.map(item => item.url),
    identifier: {
      '@type': 'PropertyValue',
      'propertyID': site.registration.scheme,
      'value': site.registration.number,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      'contactType': 'customer service',
      'email': site.contact.email,
      'telephone': site.contact.phone,
      'url': absolute('/contact-us'),
    },
    knowsAbout: [
      'Artificial intelligence',
      'Machine learning',
      'Large language models',
      'Web3',
      'Blockchain',
      'Software architecture',
      'Open-source software',
    ],
  }),
  defineWebSite({
    name: site.name,
    description: site.description,
    inLanguage: 'en',
  }),
])
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
