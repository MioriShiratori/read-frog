import { useSelector } from "@tanstack/react-store"
import { useAtomValue } from "jotai"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/base-ui/alert-dialog"
import { Button } from "@/components/ui/base-ui/button"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { APIKeyField } from "./provider-config-form/api-key-field"
import { AdvancedOptionsSection } from "./provider-config-form/components/advanced-options-section"
import { ConfigHeader as ProviderConfigHeader } from "./provider-config-form/config-header"
import { ProviderHeadersField } from "./provider-config-form/provider-headers-field"
import { ProviderOptionsField } from "./provider-config-form/provider-options-field"
import { ProviderSpecificSettingsField } from "./provider-config-form/provider-specific-settings-field"
import { ProviderURLField } from "./provider-config-form/provider-url-field"
import { ReasoningField } from "./provider-config-form/reasoning-field"
import { TemperatureField } from "./provider-config-form/temperature-field"
import { TranslateModelSelector } from "./provider-config-form/translate-model-selector"
import { CustomProvider, useApiProviderForm, useProviderEditor } from "./provider-editor-context"
export { useProviderEditor, useProviderForm } from "./provider-editor-context"

function Form({ children }: { children: React.ReactNode }) {
  const form = useApiProviderForm()
  return <form.AppForm>{children}</form.AppForm>
}

function ConfigHeader() {
  const form = useApiProviderForm()
  const providerType = useSelector(form.store, (state) => state.values.provider)
  return <ProviderConfigHeader providerType={providerType} />
}

function NameField() {
  const form = useApiProviderForm()
  const providerId = useProviderEditor().state.providerId
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)

  return (
    <form.AppField
      name="name"
      validators={{
        onChange: ({ value }) => {
          const providerWithSameName = providersConfig.find(
            (provider) => provider.name === value && provider.id !== providerId,
          )
          return providerWithSameName
            ? i18n.t("options.apiProviders.form.duplicateProviderName", [value])
            : undefined
        },
      }}
    >
      {(field) => (
        <field.InputFieldAutoSave label={i18n.t("options.apiProviders.form.fields.name")} />
      )}
    </form.AppField>
  )
}

function DescriptionField() {
  const form = useApiProviderForm()
  return (
    <form.AppField name="description">
      {(field) => (
        <field.InputFieldAutoSave label={i18n.t("options.apiProviders.form.fields.description")} />
      )}
    </form.AppField>
  )
}

function ConnectionFields() {
  const form = useApiProviderForm()
  return (
    <>
      <APIKeyField form={form} />
      <ProviderURLField form={form} />
    </>
  )
}

function ProviderSpecificFields() {
  return <ProviderSpecificSettingsField form={useApiProviderForm()} />
}

function TranslationModelFields() {
  const form = useApiProviderForm()
  return (
    <>
      <TranslateModelSelector form={form} />
      <ReasoningField form={form} />
    </>
  )
}

function AdvancedFields() {
  const form = useApiProviderForm()
  return (
    <AdvancedOptionsSection>
      <TemperatureField form={form} />
      <ProviderOptionsField form={form} />
      <ProviderHeadersField form={form} />
    </AdvancedOptionsSection>
  )
}

function DuplicateButton() {
  const duplicate = useProviderEditor().actions.duplicate
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void duplicate()}>
      {i18n.t("options.apiProviders.form.duplicate")}
    </Button>
  )
}

function DeleteButton() {
  const deleteProvider = useProviderEditor().actions.delete
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" variant="destructive" size="sm" />}>
        {i18n.t("options.apiProviders.form.delete")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {i18n.t("options.apiProviders.form.deleteDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {i18n.t("options.apiProviders.form.deleteDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {i18n.t("options.apiProviders.form.deleteDialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => void deleteProvider()}>
            {i18n.t("options.apiProviders.form.deleteDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export const ProviderEditor = {
  Form,
  ConfigHeader,
  NameField,
  DescriptionField,
  ConnectionFields,
  ProviderSpecificFields,
  TranslationModelFields,
  AdvancedFields,
  DuplicateButton,
  DeleteButton,
}

export const CustomProviderEditor = {
  Provider: CustomProvider,
}
