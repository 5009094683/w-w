<script setup lang="ts">
import { glossary } from '#content/glossary'

const crumbs = [{ label: 'Home', to: '/' }]

usePageSeo({
  path: glossary.path,
  title: glossary.title,
  description: glossary.description,
  updatedAt: glossary.updatedAt,
  summary: glossary.lead.text,
  heading: glossary.heading,
  label: 'Glossary',
  crumbs,
})

const { absolute } = useAbsoluteUrl()
const termSetId = absolute(`${glossary.path}#terms`)

useSchemaOrg([
  {
    '@type': 'DefinedTermSet',
    '@id': termSetId,
    'name': glossary.title,
    'description': glossary.lead.text,
    'url': absolute(glossary.path),
    'hasDefinedTerm': glossary.terms.map(term => ({
      '@type': 'DefinedTerm',
      '@id': absolute(`${glossary.path}#${term.id}`),
      'name': term.term,
      'description': term.definition.text,
      'url': absolute(`${glossary.path}#${term.id}`),
      'inDefinedTermSet': termSetId,
      ...(term.aka.length ? { alternateName: term.aka } : {}),
    })),
  },
])

const letters = [...new Set(glossary.terms.map(term => term.term[0]!.toUpperCase()))]
const groups = letters.map(letter => ({
  letter,
  terms: glossary.terms.filter(term => term.term[0]!.toUpperCase() === letter),
}))
</script>

<template>
  <article>
    <PageHero label="Reference" :title="glossary.heading" :lead="glossary.lead.html" :crumbs="crumbs" :updated-at="glossary.updatedAt">
      <template #actions>
        <nav aria-label="Jump to a letter" class="flex flex-wrap gap-1.5">
          <a
            v-for="letter in letters"
            :key="letter"
            :href="`#letter-${letter.toLowerCase()}`"
            class="flex size-11 items-center justify-center border border-rule font-mono text-[0.9375rem] font-medium transition-colors hover:border-ink"
          >
            {{ letter }}
          </a>
        </nav>
      </template>
    </PageHero>

    <section v-for="group in groups" :id="`letter-${group.letter.toLowerCase()}`" :key="group.letter" class="border-b border-rule">
      <div class="wrap grid gap-x-10 gap-y-4 py-10 lg:grid-cols-12">
        <h2 class="font-mono text-[2.25rem] font-medium leading-none text-accent-ink lg:col-span-3">
          {{ group.letter }}
        </h2>
        <!--
          Each term is a heading followed by paragraphs, not a definition list:
          the Markdown copy of this page is made from this markup, and a
          definition list comes out of that conversion as raw HTML.
        -->
        <div class="lg:col-span-9">
          <div
            v-for="term in group.terms"
            :id="term.id"
            :key="term.id"
            class="grid gap-x-10 gap-y-2 border-t border-rule py-6 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]"
          >
            <div>
              <h3 class="text-[1.2rem] leading-snug tracking-[-0.01em]">
                {{ term.term }}
              </h3>
              <p v-if="term.aka.length" class="mt-1 text-[0.875rem] text-faint">
                Also: {{ term.aka.join(', ') }}
              </p>
            </div>
            <div>
              <div class="rich text-pretty text-soft" v-html="term.definition.html" />
              <p v-if="term.see" class="mt-3 text-[0.9375rem]">
                <span class="label mr-1">See</span> <NuxtLink :to="term.see.href" class="link font-medium">{{ term.see.label }}</NuxtLink>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <CtaBand />
  </article>
</template>
