import type { CSSProperties } from "react"
import type { Config } from "@/types/config/config"
import type { ProviderConfig } from "@/types/config/provider"
import type { ProviderCapability } from "@/utils/providers/provider-registry"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useRef } from "react"
import { SetApiKeyWarning } from "@/components/llm-providers/set-api-key-warning"
import ProviderIcon from "@/components/provider-icon"
import { useTheme } from "@/components/providers/theme-provider"
import { toastManager } from "@/components/ui/base-ui/toast"
import { configAtom, writeConfigAtom } from "@/utils/atoms/config"
import {
  buildFeatureProviderPatch,
  FEATURE_KEYS,
  FEATURE_PROVIDER_DEFS,
  getFeatureDescriptionI18nKey,
  getFeatureLabelI18nKey,
} from "@/utils/constants/feature-providers"
import { PROVIDER_ITEMS } from "@/utils/constants/providers"
import { getSelectionToolbarActions, patchSelectionToolbarAction } from "@/utils/custom-actions"
import { i18n } from "@/utils/i18n"
import { isLocalProviderConfigCompatibleWithCapability } from "@/utils/providers/provider-registry"
import { providerSupportsTranslationOnlyMode } from "@/utils/providers/translation-only-gate"
import { ConfigSection } from "../../../components/config-section"
import { toSystemPromptPreview } from "./prompt-preview"
import "./matrix.css"

export { toSystemPromptPreview } from "./prompt-preview"

interface MatrixRow {
  id: string
  name: string
  description: string
  capability: ProviderCapability
  providerId: string
  assign: (config: Config, providerId: string) => Partial<Config>
}
function buildRows(config: Config): MatrixRow[] {
  return [
    ...FEATURE_KEYS.map((featureKey) => ({
      id: featureKey,
      name: i18n.t(getFeatureLabelI18nKey(featureKey)),
      description: i18n.t(getFeatureDescriptionI18nKey(featureKey)),
      capability: featureKey,
      providerId: FEATURE_PROVIDER_DEFS[featureKey].getProviderId(config),
      assign: (_current: Config, providerId: string) =>
        buildFeatureProviderPatch({ [featureKey]: providerId }),
    })),
    ...getSelectionToolbarActions(config.selectionToolbar)
      .filter((action) => action.enabled !== false)
      .map((action) => ({
        id: action.id,
        name: action.name,
        description: toSystemPromptPreview(action),
        capability: "customAction" as const,
        providerId: action.providerId,
        assign: (current: Config, providerId: string) => ({
          selectionToolbar: patchSelectionToolbarAction(current.selectionToolbar, action.id, {
            providerId,
          }),
        }),
      })),
  ]
}
function canAssign(row: MatrixRow, provider: ProviderConfig, config: Config): boolean {
  if (!provider.enabled || !isLocalProviderConfigCompatibleWithCapability(row.capability, provider))
    return false
  return (
    row.capability !== "pageTranslation" ||
    config.pageTranslation.mode !== "translationOnly" ||
    providerSupportsTranslationOnlyMode(provider.provider)
  )
}

export function FeatureProvidersConfig() {
  const { theme } = useTheme()
  const config = useAtomValue(configAtom)
  const setConfig = useSetAtom(writeConfigAtom)
  const viewport = useRef<HTMLDivElement>(null)
  const providers = config.providersConfig.filter((provider) => provider.enabled)
  const rows = buildRows(config)
  useEffect(() => {
    const node = viewport.current
    if (!node) return undefined
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || node.scrollWidth <= node.clientWidth) return
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (!delta) return
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientWidth : 1
      node.scrollLeft += delta * unit
    }
    node.addEventListener("wheel", wheel, { passive: false })
    return () => node.removeEventListener("wheel", wheel)
  }, [])

  const assign = async (row: MatrixRow, provider: ProviderConfig) => {
    if (row.providerId === provider.id) return
    try {
      await setConfig((current) => {
        const latest = current.providersConfig.find((item) => item.id === provider.id)
        if (!latest || !canAssign(row, latest, current)) return {}
        return row.assign(current, provider.id)
      })
    } catch (error) {
      toastManager.add({
        type: "error",
        title: i18n.t("options.apiProviders.featureProviders.saveError"),
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }
  // Pad short catalogs to four columns so adding a provider does not resize existing cells.
  const padding = Math.max(0, 4 - providers.length)
  const blanks = Array.from({ length: padding }, (_, index) => index)
  return (
    <ConfigSection
      id="feature-providers"
      title={i18n.t("options.apiProviders.featureProviders.title")}
    >
      <div className="provider-matrix-container">
        <div
          className="provider-matrix-viewport"
          ref={viewport}
          tabIndex={0}
          role="region"
          aria-label={i18n.t("options.apiProviders.featureProviders.title")}
        >
          <table
            className="provider-matrix"
            style={{ "--provider-count": Math.max(4, providers.length) } as CSSProperties}
          >
            <colgroup>
              <col className="provider-matrix-label-column" />
              {providers.map((provider) => (
                <col key={provider.id} />
              ))}
              {blanks.map((index) => (
                <col key={`empty-${index}`} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="provider-matrix-label">
                  {i18n.t("options.apiProviders.featureProviders.function")}
                </th>
                {providers.map((provider) => (
                  <th key={provider.id} scope="col" title={provider.name}>
                    <span className="flex flex-col items-center gap-2 overflow-hidden py-3">
                      <ProviderIcon
                        logo={PROVIDER_ITEMS[provider.provider].logo(theme)}
                        className="size-6 shrink-0"
                      />
                      <span className="max-w-full truncate">{provider.name}</span>
                    </span>
                  </th>
                ))}
                {blanks.map((index) => (
                  <th aria-hidden="true" key={`empty-${index}`} />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="provider-matrix-label">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {row.name}
                      <SetApiKeyWarning
                        providerConfig={
                          config.providersConfig.find(
                            (provider) => provider.id === row.providerId,
                          ) ?? null
                        }
                      />
                    </div>
                    <span
                      className="mt-1 block truncate text-xs font-normal text-muted-foreground"
                      title={row.description}
                    >
                      {row.description}
                    </span>
                  </th>
                  {providers.map((provider) => {
                    const compatible = canAssign(row, provider, config)
                    const selected = row.providerId === provider.id
                    return (
                      <td key={provider.id}>
                        <button
                          type="button"
                          className="provider-matrix-cell"
                          disabled={!compatible}
                          aria-pressed={selected}
                          aria-label={`${row.name}: ${provider.name}`}
                          title={
                            !compatible
                              ? i18n.t("options.apiProviders.featureProviders.incompatible")
                              : provider.name
                          }
                          onClick={() => void assign(row, provider)}
                        >
                          <span aria-hidden="true" className="provider-matrix-marker">
                            {selected ? "●" : compatible ? "○" : "—"}
                          </span>
                        </button>
                      </td>
                    )
                  })}
                  {blanks.map((index) => (
                    <td key={`empty-${index}`} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {providers.length
            ? i18n.t("options.apiProviders.featureProviders.scrollHint")
            : i18n.t("options.apiProviders.featureProviders.empty")}
        </p>
      </div>
    </ConfigSection>
  )
}
