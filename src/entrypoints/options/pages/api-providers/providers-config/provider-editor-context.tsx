import type { AutosaveController } from "@/components/form/autosave-controller"
import type { APIProviderConfig } from "@/types/config/provider"
import type { FeatureKey } from "@/utils/constants/feature-providers"
import { useAtomValue, useSetAtom } from "jotai"
import { createContext, use } from "react"
import { useAutosave } from "@/components/form/use-autosave"
import { useTheme } from "@/components/providers/theme-provider"
import { configAtom, writeConfigAtom } from "@/utils/atoms/config"
import { buildFeatureProviderPatch } from "@/utils/constants/feature-providers"
import { API_PROVIDER_ITEMS } from "@/utils/constants/providers"
import { patchSelectionToolbarAction } from "@/utils/custom-actions"
import { formOpts, useAppForm } from "./provider-config-form/form"

interface ProviderIdentity {
  id: string
  logo: string
  name: string
}

interface ProviderEditorContextValue {
  state: {
    identity: ProviderIdentity
    assignmentTarget: {
      providerId: string
      providerType: APIProviderConfig["provider"]
    }
  }
  actions: {
    assignFeature: (featureKey: FeatureKey) => Promise<void>
    assignLanguageDetection: () => Promise<void>
    assignCustomAction: (actionId: string) => Promise<void>
    duplicate: () => Promise<void>
    delete: () => Promise<void>
  }
}

const ProviderEditorContext = createContext<ProviderEditorContextValue | null>(null)

export function useProviderEditor() {
  const context = use(ProviderEditorContext)
  if (!context) {
    throw new Error("ProviderEditor components must be rendered inside a ProviderEditor Provider")
  }
  return context
}

function useProviderEditorValue({
  identity,
  providerType,
  duplicate,
  delete: deleteProvider,
}: {
  identity: ProviderIdentity
  providerType: APIProviderConfig["provider"]
  duplicate: () => Promise<void>
  delete: () => Promise<void>
}): ProviderEditorContextValue {
  const config = useAtomValue(configAtom)
  const setConfig = useSetAtom(writeConfigAtom)
  const providerId = identity.id

  const getEnabledProvidersConfig = () => {
    const provider = config.providersConfig.find((item) => item.id === providerId)
    if (!provider || provider.enabled) {
      return undefined
    }

    return config.providersConfig.map((item) =>
      item.id === providerId ? { ...item, enabled: true } : item,
    )
  }

  const getAssignmentProvidersPatch = () => {
    const providersConfig = getEnabledProvidersConfig()
    return providersConfig ? { providersConfig } : {}
  }

  return {
    state: {
      identity,
      assignmentTarget: {
        providerId,
        providerType,
      },
    },
    actions: {
      assignFeature: async (featureKey) => {
        await setConfig({
          ...buildFeatureProviderPatch({ [featureKey]: providerId }),
          ...getAssignmentProvidersPatch(),
        })
      },
      assignLanguageDetection: async () => {
        await setConfig({
          languageDetection: {
            mode: "llm",
            providerId,
          },
          ...getAssignmentProvidersPatch(),
        })
      },
      assignCustomAction: async (actionId) => {
        await setConfig({
          selectionToolbar: patchSelectionToolbarAction(config.selectionToolbar, actionId, {
            providerId,
          }),
          ...getAssignmentProvidersPatch(),
        })
      },
      duplicate,
      delete: deleteProvider,
    },
  }
}

export function useProviderForm(
  providerConfig: APIProviderConfig,
  save: (providerConfig: APIProviderConfig, changes: Partial<APIProviderConfig>) => Promise<void>,
) {
  const form = useAppForm({
    ...formOpts,
    defaultValues: providerConfig,
    onSubmitMeta: { revision: 0 },
    onSubmit: async ({ value, meta }) => {
      await autosave.commit(value, meta.revision)
    },
  })
  const autosave: AutosaveController<APIProviderConfig> = useAutosave({
    initialValue: providerConfig,
    getDraft: () => form.state.values,
    setField: (key, value) =>
      form.setFieldValue(key, value as never, { dontUpdateMeta: true, dontRunListeners: true }),
    reset: (value) => form.reset(value),
    submit: (revision) => form.handleSubmit({ revision }),
    persist: save,
  })
  return { form, autosave }
}

type ProviderForm = ReturnType<typeof useProviderForm>["form"]

const ApiProviderFormContext = createContext<ProviderForm | null>(null)

export function useApiProviderForm() {
  const form = use(ApiProviderFormContext)
  if (!form) {
    throw new Error("ProviderEditor form fields require a CustomProviderEditor Provider")
  }
  return form
}

export function CustomProvider({
  providerConfig,
  form,
  duplicate,
  delete: deleteProvider,
  children,
}: {
  providerConfig: APIProviderConfig
  form: ProviderForm
  duplicate: () => Promise<void>
  delete: () => Promise<void>
  children: React.ReactNode
}) {
  const { theme } = useTheme()
  const provider = API_PROVIDER_ITEMS[providerConfig.provider]
  const value = useProviderEditorValue({
    identity: {
      id: providerConfig.id,
      logo: provider.logo(theme),
      name: providerConfig.name,
    },
    providerType: providerConfig.provider,
    duplicate,
    delete: deleteProvider,
  })

  return (
    <ProviderEditorContext value={value}>
      <ApiProviderFormContext value={form}>{children}</ApiProviderFormContext>
    </ProviderEditorContext>
  )
}
