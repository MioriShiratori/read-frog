import type { APIProviderConfig } from "@/types/config/provider"
import { useSetAtom } from "jotai"
import { requestEditorNavigationAtom } from "@/components/form/autosave-navigation"
import { Field, FieldLabel } from "@/components/ui/base-ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/base-ui/select"
import { toastManager } from "@/components/ui/base-ui/toast"
import { isAPIProviderConfig } from "@/types/config/provider"
import { writeConfigAtom } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { OPENCODE_BASE_URLS, switchCustomProviderProtocol } from "@/utils/providers/connection-mode"

export function ConnectionModeField({ providerConfig }: { providerConfig: APIProviderConfig }) {
  const setConfig = useSetAtom(writeConfigAtom)
  const requestNavigation = useSetAtom(requestEditorNavigationAtom)
  const isOpenCode = providerConfig.provider === "opencode"
  if (!isOpenCode && !["openai-compatible", "open-responses"].includes(providerConfig.provider))
    return null
  const value = isOpenCode
    ? (providerConfig.service ?? "pay-as-you-go")
    : providerConfig.provider === "open-responses"
      ? "responses"
      : "chat-completions"
  const choices = isOpenCode
    ? [
        { value: "pay-as-you-go", label: i18n.t("options.apiProviders.form.payAsYouGo") },
        { value: "go", label: "Go" },
      ]
    : [
        { value: "chat-completions", label: "Chat Completions" },
        { value: "responses", label: "Responses" },
      ]
  const change = async (nextValue: string | null) => {
    if (!nextValue || nextValue === value) return
    try {
      await requestNavigation(async () => {
        await setConfig((current) => ({
          providersConfig: current.providersConfig.map((provider) => {
            if (provider.id !== providerConfig.id || !isAPIProviderConfig(provider)) return provider
            if (
              provider.provider === "opencode" &&
              (nextValue === "go" || nextValue === "pay-as-you-go")
            ) {
              return { ...provider, service: nextValue, baseURL: OPENCODE_BASE_URLS[nextValue] }
            }
            if (nextValue === "responses" || nextValue === "chat-completions") {
              return switchCustomProviderProtocol(provider, nextValue)
            }
            return provider
          }),
        }))
      })
    } catch (error) {
      toastManager.add({
        type: "error",
        title: i18n.t("options.apiProviders.form.modeChangeError"),
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }
  const id = `connection-mode-${providerConfig.id}`
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {i18n.t(
          isOpenCode
            ? "options.apiProviders.form.openCodeService"
            : "options.apiProviders.form.protocol",
        )}
      </FieldLabel>
      <Select value={value} onValueChange={(next) => void change(next)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue>{choices.find((choice) => choice.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => (
            <SelectItem key={choice.value} value={choice.value}>
              {choice.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
