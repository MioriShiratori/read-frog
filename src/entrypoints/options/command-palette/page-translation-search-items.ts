import type { SearchItemDefinition } from "./search-items"

export const PAGE_TRANSLATION_SEARCH_ITEMS = [
  // Translation page
  {
    sectionId: "translation-mode",
    route: "/page-translation",
    titleKey: "options.translation.preference.translationMode.title",
    descriptionKey: "options.translation.preference.translationMode.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "translate-range",
    route: "/page-translation",
    titleKey: "options.translation.preference.translateRange.title",
    descriptionKey: "options.translation.preference.translateRange.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "translate-title",
    route: "/page-translation",
    titleKey: "options.translation.preference.translateTitle.title",
    descriptionKey: "options.translation.preference.translateTitle.description",
    pageKey: "options.translation.title",
  },
  {
    // Titled with the section, so the row that reads "Enable" is still findable on its own.
    sectionId: "hover-translation",
    route: "/page-translation",
    titleKey: "options.translation.hoverTranslation.title",
    descriptionKey: "options.translation.hoverTranslation.enable.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "translation-style",
    route: "/page-translation",
    titleKey: "options.translation.translationStyle.title",
    descriptionKey: "options.translation.translationStyle.description",
    pageKey: "options.translation.title",
  },
  {
    // Its own page, drilled into from the Translation Display Style section.
    sectionId: "custom-css",
    route: "/page-translation/custom-css",
    titleKey: "options.translation.translationStyle.cssEditor",
    descriptionKey: "options.translation.translationStyle.cssEditorDescription",
    pageKey: "options.translation.title",
  },
  {
    // Its own page, drilled into from the Translation page's Personalized Prompts section.
    sectionId: "personalized-prompts",
    route: "/page-translation/prompts",
    titleKey: "options.translation.personalizedPrompts.title",
    descriptionKey: "options.translation.personalizedPrompts.description",
    pageKey: "options.translation.title",
  },
  {
    // Its own page, drilled into from the Translation control section.
    sectionId: "auto-translate-website",
    route: "/page-translation/translation-control/auto-translate-websites",
    titleKey: "options.translation.translationControl.autoTranslateWebsite.title",
    descriptionKey: "options.translation.translationControl.autoTranslateWebsite.description",
    pageKey: "options.translation.title",
  },
  {
    // Its own page, drilled into from the Translation control section.
    sectionId: "never-auto-translate-website",
    route: "/page-translation/translation-control/never-auto-translate-websites",
    titleKey: "options.translation.translationControl.neverAutoTranslateWebsite.title",
    descriptionKey: "options.translation.translationControl.neverAutoTranslateWebsite.description",
    pageKey: "options.translation.title",
  },
  {
    // On the Translation control page, drilled into from the Translation page.
    sectionId: "auto-translate-languages",
    route: "/page-translation/translation-control",
    titleKey: "options.translation.translationControl.autoTranslateLanguages.title",
    descriptionKey: "options.translation.translationControl.autoTranslateLanguages.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "skip-languages",
    route: "/page-translation/translation-control",
    titleKey: "options.translation.translationControl.skipLanguages.title",
    descriptionKey: "options.translation.translationControl.skipLanguages.description",
    pageKey: "options.translation.title",
  },
  {
    // On the Translation queue page, drilled into from the Translation page.
    sectionId: "request-rate",
    route: "/page-translation/translation-queue",
    titleKey: "options.translation.translationQueue.requestQueueConfig.title",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "request-batch",
    route: "/page-translation/translation-queue",
    titleKey: "options.translation.translationQueue.batchQueueConfig.title",
    descriptionKey: "options.translation.translationQueue.batchQueueConfig.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "request-timeout",
    route: "/page-translation/translation-queue",
    titleKey: "options.translation.translationQueue.requestTimeout.title",
    descriptionKey: "options.translation.translationQueue.requestTimeout.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "preload-config",
    route: "/page-translation/translation-queue",
    titleKey: "options.translation.translationQueue.preloadConfig.title",
    descriptionKey: "options.translation.translationQueue.preloadConfig.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "small-paragraph-filter",
    route: "/page-translation/translation-control",
    titleKey: "options.translation.translationControl.smallParagraphFilter.title",
    descriptionKey: "options.translation.translationControl.smallParagraphFilter.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "clear-cache",
    route: "/page-translation",
    titleKey: "options.translation.cache.clearCache.title",
    descriptionKey: "options.translation.cache.clearCache.description",
    pageKey: "options.translation.title",
  },
  {
    // Its own page, drilled into from the Translation control section.
    sectionId: "site-rules-user-rules",
    route: "/page-translation/translation-control/site-rules",
    titleKey: "options.siteRules.userRules.title",
    descriptionKey: "options.siteRules.userRules.description",
    pageKey: "options.translation.title",
  },
  {
    sectionId: "site-rules-built-in",
    route: "/page-translation/translation-control/site-rules",
    titleKey: "options.siteRules.builtIn.title",
    descriptionKey: "options.siteRules.builtIn.description",
    pageKey: "options.translation.title",
  },
] satisfies SearchItemDefinition[]
