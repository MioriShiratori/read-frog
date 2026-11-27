import type { GeneratedI18nStructure } from "#i18n"
import { CUSTOM_ACTION_LAYOUT_SECTION_ID } from "@/utils/navigation"
import { PAGE_TRANSLATION_SEARCH_ITEMS } from "./page-translation-search-items"

type I18nKey = keyof GeneratedI18nStructure

export interface SearchItem {
  sectionId: string
  route: string
  titleKey: string
  descriptionKey?: string
  pageKey: string
}

export type SearchItemDefinition = Omit<SearchItem, "titleKey" | "descriptionKey" | "pageKey"> & {
  titleKey: I18nKey
  descriptionKey?: I18nKey
  pageKey: I18nKey
}

export const SEARCH_ITEMS: SearchItem[] = [
  // Advanced page
  {
    sectionId: "glossary-enabled",
    route: "/advanced/glossary",
    titleKey: "options.advanced.glossary.enable.title",
    descriptionKey: "options.advanced.glossary.enable.description",
    pageKey: "options.advanced.glossary.title",
  },
  {
    sectionId: "glossary-library",
    route: "/advanced/glossary",
    titleKey: "options.advanced.glossary.library.title",
    descriptionKey: "options.advanced.glossary.library.description",
    pageKey: "options.advanced.glossary.title",
  },
  // Preference page
  {
    // Titled with the section, so "appearance" still finds a row that reads "Theme".
    sectionId: "theme",
    route: "/preference",
    titleKey: "options.preference.appearanceAndLanguage.title",
    descriptionKey: "options.preference.appearanceAndLanguage.theme.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "interface-language",
    route: "/preference",
    titleKey: "options.preference.appearanceAndLanguage.interfaceLanguage.title",
    descriptionKey: "options.preference.appearanceAndLanguage.interfaceLanguage.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "translation-source-language",
    route: "/preference",
    titleKey: "options.preference.translationLanguage.sourceCode.title",
    descriptionKey: "options.preference.translationLanguage.sourceCode.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "translation-target-language",
    route: "/preference",
    titleKey: "options.preference.translationLanguage.targetCode.title",
    descriptionKey: "options.preference.translationLanguage.targetCode.description",
    pageKey: "options.preference.title",
  },
  {
    // Its own page, drilled into from the Preference page's Extension activation section.
    sectionId: "site-control-mode",
    route: "/preference/extension-activation",
    titleKey: "options.preference.extensionActivation.mode.title",
    descriptionKey: "options.preference.extensionActivation.mode.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "google-drive-sync",
    route: "/preference",
    titleKey: "options.preference.config.googleDrive.title",
    descriptionKey: "options.preference.config.googleDrive.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "manual-config-sync",
    route: "/preference",
    titleKey: "options.preference.config.manualSync.title",
    descriptionKey: "options.preference.config.manualSync.description",
    pageKey: "options.preference.title",
  },
  {
    // Its own page, drilled into from the Preference page's Config section.
    sectionId: "config-backup",
    route: "/preference/config-backup",
    titleKey: "options.preference.config.backup.title",
    descriptionKey: "options.preference.config.backup.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "reset-config",
    route: "/preference",
    titleKey: "options.preference.config.reset.title",
    descriptionKey: "options.preference.config.reset.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "beta-experience",
    route: "/preference",
    titleKey: "options.preference.userExperience.beta.title",
    descriptionKey: "options.preference.userExperience.beta.description",
    pageKey: "options.preference.title",
  },
  {
    sectionId: "analytics",
    route: "/preference",
    titleKey: "options.preference.userExperience.analytics.title",
    descriptionKey: "options.preference.userExperience.analytics.description",
    pageKey: "options.preference.title",
  },

  // Shortcuts page
  {
    sectionId: "page-translation-shortcut",
    route: "/shortcuts",
    titleKey: "options.shortcuts.pageTranslation.title",
    descriptionKey: "options.shortcuts.pageTranslation.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "translation-mode-shortcut",
    route: "/shortcuts",
    titleKey: "options.shortcuts.translationMode.title",
    descriptionKey: "options.shortcuts.translationMode.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "selection-translation-shortcut",
    route: "/shortcuts",
    titleKey: "options.shortcuts.selectionTranslation.title",
    descriptionKey: "options.shortcuts.selectionTranslation.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "selection-speak-shortcut",
    route: "/shortcuts",
    titleKey: "options.shortcuts.selectionSpeak.title",
    descriptionKey: "options.shortcuts.selectionSpeak.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "selection-annotation-mode-shortcut",
    route: "/shortcuts",
    titleKey: "options.shortcuts.selectionAnnotationMode.title",
    descriptionKey: "options.shortcuts.selectionAnnotationMode.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "subtitles-toggle-shortcut",
    route: "/shortcuts",
    titleKey: "options.shortcuts.subtitlesToggle.title",
    descriptionKey: "options.shortcuts.subtitlesToggle.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "node-translation-hotkey",
    route: "/shortcuts",
    titleKey: "options.shortcuts.nodeTranslation.title",
    descriptionKey: "options.shortcuts.nodeTranslation.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "translation-hub-shortcut",
    route: "/shortcuts",
    titleKey: "options.shortcuts.translationHub.title",
    descriptionKey: "options.shortcuts.translationHub.description",
    pageKey: "options.shortcuts.title",
  },
  {
    sectionId: "selection-action-shortcuts",
    route: "/shortcuts",
    titleKey: "options.shortcuts.actions.title",
    descriptionKey: "options.shortcuts.actions.description",
    pageKey: "options.shortcuts.title",
  },

  // API Providers page
  {
    sectionId: "provider-config",
    route: "/api-providers",
    titleKey: "options.apiProviders.configTitle",
    descriptionKey: "options.apiProviders.description",
    pageKey: "options.apiProviders.title",
  },
  {
    sectionId: "feature-providers",
    route: "/api-providers",
    titleKey: "options.apiProviders.featureProviders.title",
    descriptionKey: "options.apiProviders.featureProviders.description",
    pageKey: "options.apiProviders.title",
  },
  {
    sectionId: "language-detection",
    route: "/api-providers",
    titleKey: "options.apiProviders.languageDetection.title",
    descriptionKey: "options.apiProviders.languageDetection.description",
    pageKey: "options.apiProviders.title",
  },
  {
    sectionId: "ai-content-aware",
    route: "/api-providers",
    titleKey: "options.apiProviders.aiContentAware.title",
    descriptionKey: "options.apiProviders.aiContentAware.description",
    pageKey: "options.apiProviders.title",
  },

  // Custom Actions page
  {
    sectionId: "custom-actions",
    route: "/custom-actions",
    titleKey: "options.selectionToolbar.customActions.title",
    descriptionKey: "options.selectionToolbar.customActions.description",
    pageKey: "options.selectionToolbar.customActions.title",
  },
  {
    // The Layout heading in the Config tab; the scroll switches to that tab first.
    sectionId: CUSTOM_ACTION_LAYOUT_SECTION_ID,
    route: "/custom-actions",
    titleKey: "options.selectionToolbar.customActions.form.layout.title",
    descriptionKey: "options.selectionToolbar.customActions.form.layout.description",
    pageKey: "options.selectionToolbar.customActions.title",
  },

  ...PAGE_TRANSLATION_SEARCH_ITEMS,
  {
    sectionId: "image-translation-usage",
    route: "/image-translation",
    titleKey: "imageTranslation.title",
    descriptionKey: "imageTranslation.settings.description",
    pageKey: "imageTranslation.title",
  },
  // Floating Button page
  {
    sectionId: "floating-button-toggle",
    route: "/floating-button",
    titleKey: "options.floatingButton.enable.title",
    descriptionKey: "options.floatingButton.enable.description",
    pageKey: "options.floatingButton.title",
  },
  {
    sectionId: "floating-button-side",
    route: "/floating-button",
    titleKey: "options.floatingButton.display.side.title",
    descriptionKey: "options.floatingButton.display.side.description",
    pageKey: "options.floatingButton.title",
  },
  {
    sectionId: "floating-button-disabled-sites",
    route: "/floating-button",
    titleKey: "options.floatingButton.display.disabledSites.title",
    descriptionKey: "options.floatingButton.display.disabledSites.description",
    pageKey: "options.floatingButton.title",
  },

  // Selection Toolbar page
  {
    sectionId: "selection-toolbar-toggle",
    route: "/selection-toolbar",
    titleKey: "options.selectionToolbar.enable.title",
    descriptionKey: "options.selectionToolbar.enable.description",
    pageKey: "options.selectionToolbar.title",
  },
  {
    // Titled with the section, so "translate" and "speak" both find the rows that switch
    // them on without either row's one-word title standing alone in the results.
    sectionId: "selection-toolbar-actions",
    route: "/selection-toolbar",
    titleKey: "options.selectionToolbar.actions.title",
    descriptionKey: "options.selectionToolbar.actions.translate.description",
    pageKey: "options.selectionToolbar.title",
  },

  {
    sectionId: "selection-toolbar-annotation",
    route: "/selection-toolbar",
    titleKey: "options.selectionToolbar.annotation.title",
    descriptionKey: "options.selectionToolbar.annotation.enable.description",
    pageKey: "options.selectionToolbar.title",
  },
  {
    sectionId: "selection-toolbar-opacity",
    route: "/selection-toolbar",
    titleKey: "options.selectionToolbar.display.opacity.title",
    descriptionKey: "options.selectionToolbar.display.opacity.description",
    pageKey: "options.selectionToolbar.title",
  },
  {
    sectionId: "selection-toolbar-disabled-sites",
    route: "/selection-toolbar",
    titleKey: "options.selectionToolbar.display.disabledSites.title",
    descriptionKey: "options.selectionToolbar.display.disabledSites.description",
    pageKey: "options.selectionToolbar.title",
  },

  // Context Menu page
  {
    sectionId: "context-menu-translate",
    route: "/context-menu",
    titleKey: "options.contextMenu.enable.title",
    descriptionKey: "options.contextMenu.enable.description",
    pageKey: "options.contextMenu.title",
  },

  // Input Translation page
  {
    // Titled with the section, so the row that reads "Enable" is still findable on its own.
    sectionId: "input-translation-trigger",
    route: "/input-translation",
    titleKey: "options.inputTranslation.trigger.title",
    descriptionKey: "options.inputTranslation.trigger.enable.description",
    pageKey: "options.inputTranslation.title",
  },
  {
    sectionId: "input-translation-threshold",
    route: "/input-translation",
    titleKey: "options.inputTranslation.trigger.threshold.title",
    descriptionKey: "options.inputTranslation.trigger.threshold.description",
    pageKey: "options.inputTranslation.title",
  },
  {
    sectionId: "input-translation-languages",
    route: "/input-translation",
    titleKey: "options.inputTranslation.languages.title",
    descriptionKey: "options.inputTranslation.languages.pair.description",
    pageKey: "options.inputTranslation.title",
  },
  {
    sectionId: "input-translation-cycle",
    route: "/input-translation",
    titleKey: "options.inputTranslation.languages.cycle.title",
    descriptionKey: "options.inputTranslation.languages.cycle.description",
    pageKey: "options.inputTranslation.title",
  },

  // Video Subtitles page
  {
    // Its own page, drilled into from the Enable row of the Basics section.
    sectionId: "subtitles-sites",
    route: "/video-subtitles/sites",
    titleKey: "options.videoSubtitles.preference.enable.title",
    descriptionKey: "options.videoSubtitles.preference.enable.description",
    pageKey: "options.videoSubtitles.title",
  },
  {
    sectionId: "subtitles-ai-segmentation",
    route: "/video-subtitles",
    titleKey: "options.videoSubtitles.preference.aiSegmentation.title",
    descriptionKey: "options.videoSubtitles.preference.aiSegmentation.description",
    pageKey: "options.videoSubtitles.title",
  },
  {
    sectionId: "subtitles-pause-on-hover",
    route: "/video-subtitles",
    titleKey: "options.videoSubtitles.preference.pauseOnHover.title",
    descriptionKey: "options.videoSubtitles.preference.pauseOnHover.description",
    pageKey: "options.videoSubtitles.title",
  },

  {
    // Its own page, drilled into from the Video Subtitles page's Subtitle style section.
    sectionId: "subtitles-style",
    route: "/video-subtitles/style",
    titleKey: "options.videoSubtitles.style.title",
    descriptionKey: "options.videoSubtitles.style.description",
    pageKey: "options.videoSubtitles.title",
  },
  {
    // A page below the style page, drilled into from the custom CSS row at its bottom.
    sectionId: "subtitles-custom-css",
    route: "/video-subtitles/style/custom-css",
    titleKey: "options.videoSubtitles.style.customCSS.title",
    descriptionKey: "options.videoSubtitles.style.customCSS.description",
    pageKey: "options.videoSubtitles.title",
  },
  {
    // Its own page, drilled into from the Video Subtitles page's Custom prompts section.
    sectionId: "subtitles-custom-prompts",
    route: "/video-subtitles/prompts",
    titleKey: "options.videoSubtitles.customPrompts.title",
    descriptionKey: "options.videoSubtitles.customPrompts.description",
    pageKey: "options.videoSubtitles.title",
  },
  {
    // On the Subtitle queue page, drilled into from the Video Subtitles page.
    sectionId: "subtitles-request-rate",
    route: "/video-subtitles/subtitles-queue",
    titleKey: "options.videoSubtitles.subtitlesQueue.requestQueueConfig.title",
    pageKey: "options.videoSubtitles.title",
  },
  {
    sectionId: "subtitles-request-batch",
    route: "/video-subtitles/subtitles-queue",
    titleKey: "options.videoSubtitles.subtitlesQueue.batchQueueConfig.title",
    descriptionKey: "options.videoSubtitles.subtitlesQueue.batchQueueConfig.description",
    pageKey: "options.videoSubtitles.title",
  },
  {
    sectionId: "subtitles-request-timeout",
    route: "/video-subtitles/subtitles-queue",
    titleKey: "options.videoSubtitles.subtitlesQueue.requestTimeout.title",
    descriptionKey: "options.videoSubtitles.subtitlesQueue.requestTimeout.description",
    pageKey: "options.videoSubtitles.title",
  },
  {
    sectionId: "clear-ai-segmentation-cache",
    route: "/video-subtitles",
    titleKey: "options.videoSubtitles.cache.clearCache.title",
    descriptionKey: "options.videoSubtitles.cache.clearCache.description",
    pageKey: "options.videoSubtitles.title",
  },

  // Text to Speech page
  {
    sectionId: "language-voice",
    route: "/tts",
    titleKey: "options.tts.voice.language.title",
    descriptionKey: "options.tts.voice.language.description",
    pageKey: "options.tts.title",
  },
  {
    sectionId: "tts-voice",
    route: "/tts",
    titleKey: "options.tts.voice.fallback.title",
    descriptionKey: "options.tts.voice.fallback.description",
    pageKey: "options.tts.title",
  },
  {
    sectionId: "tts-rate",
    route: "/tts",
    titleKey: "options.tts.speech.rate.title",
    descriptionKey: "options.tts.speech.rate.description",
    pageKey: "options.tts.title",
  },
  {
    sectionId: "tts-pitch",
    route: "/tts",
    titleKey: "options.tts.speech.pitch.title",
    descriptionKey: "options.tts.speech.pitch.description",
    pageKey: "options.tts.title",
  },
  {
    sectionId: "tts-volume",
    route: "/tts",
    titleKey: "options.tts.speech.volume.title",
    descriptionKey: "options.tts.speech.volume.description",
    pageKey: "options.tts.title",
  },
] satisfies SearchItemDefinition[]
