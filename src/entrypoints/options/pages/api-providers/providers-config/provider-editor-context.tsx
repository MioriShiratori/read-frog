import type { AutosaveController } from "@/components/form/autosave-controller"
import type { APIProviderConfig } from "@/types/config/provider"
import { createContext, use, useMemo } from "react"
import { useAutosave } from "@/components/form/use-autosave"
import { formOpts, useAppForm } from "./provider-config-form/form"

interface ProviderEditorContextValue {
  state: {
    providerId: string
  }
  actions: {
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
  const value = useMemo<ProviderEditorContextValue>(
    () => ({
      state: {
        providerId: providerConfig.id,
      },
      actions: { duplicate, delete: deleteProvider },
    }),
    [providerConfig.id, duplicate, deleteProvider],
  )

  return (
    <ProviderEditorContext value={value}>
      <ApiProviderFormContext value={form}>{children}</ApiProviderFormContext>
    </ProviderEditorContext>
  )
}
