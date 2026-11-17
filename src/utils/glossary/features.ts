import type { FeatureKey } from "../constants/feature-providers"

/** Translation features whose model prompts can carry glossary terms. */
export const GLOSSARY_FEATURE_KEYS = [
  "pageTranslation",
  "videoSubtitles",
  "selectionTranslation",
  "inputTranslation",
] as const satisfies readonly FeatureKey[]

export type GlossaryFeatureKey = (typeof GLOSSARY_FEATURE_KEYS)[number]
