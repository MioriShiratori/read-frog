import { Icon } from "@iconify/react"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/base-ui/collapsible"
import { Switch } from "@/components/ui/base-ui/switch"
import { isLLMProvider } from "@/types/config/provider"
import { configAtom, configFieldsAtomMap } from "@/utils/atoms/config"
import {
  FEATURE_KEYS,
  FEATURE_PROVIDER_DEFS,
  getFeatureLabelI18nKey,
} from "@/utils/constants/feature-providers"
import { getSelectionToolbarActions } from "@/utils/custom-actions"
import { i18n } from "@/utils/i18n"
import { providerSupportsTranslationOnlyMode } from "@/utils/providers/translation-only-gate"
import { cn } from "@/utils/styles/utils"
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
  const providerId = useProviderEditor().state.identity.id
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

function Assignments({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex cursor-pointer items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground">
        <Icon
          icon="tabler:chevron-right"
          className={cn("size-4 transition-transform duration-200", isOpen && "rotate-90")}
        />
        <span>{i18n.t("options.apiProviders.featureProviders.title")}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function AssignmentRow({
  checked,
  children,
  disabled = false,
  onCheckedChange,
}: {
  checked: boolean
  children: React.ReactNode
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    // A wrapping label gives the switch its accessible name and makes the text
    // itself a click target. The badge is a sibling of the label text rather
    // than part of it, so the row's text node stays exactly the feature name.
    <label className="flex w-fit items-center gap-2">
      <Switch checked={checked} disabled={checked || disabled} onCheckedChange={onCheckedChange} />
      <span className="text-sm">{children}</span>
    </label>
  )
}

function CompatibleFeatureAssignments() {
  const {
    state: {
      assignmentTarget: { providerId, providerType },
    },
    actions,
  } = useProviderEditor()
  const config = useAtomValue(configAtom)

  return FEATURE_KEYS.filter(
    (featureKey) =>
      FEATURE_PROVIDER_DEFS[featureKey].isProvider(providerType) &&
      // While translationOnly page mode is active, providers without markup
      // support cannot take the page-translate assignment (translation-only-gate.ts).
      !(
        featureKey === "pageTranslation" &&
        config.pageTranslation.mode === "translationOnly" &&
        !providerSupportsTranslationOnlyMode(providerType)
      ),
  ).map((featureKey) => {
    const isAssigned = FEATURE_PROVIDER_DEFS[featureKey].getProviderId(config) === providerId
    return (
      <AssignmentRow
        key={featureKey}
        checked={isAssigned}
        onCheckedChange={(checked) => {
          if (checked) void actions.assignFeature(featureKey)
        }}
      >
        {i18n.t(getFeatureLabelI18nKey(featureKey))}
      </AssignmentRow>
    )
  })
}

function LanguageDetectionAssignment({
  disabled = false,
}: {
  disabled?: boolean
} = {}) {
  const {
    state: {
      assignmentTarget: { providerId, providerType },
    },
    actions,
  } = useProviderEditor()
  const config = useAtomValue(configAtom)

  // Built-in providers have no local providerType, but declare this capability
  // in the provider registry. Local non-LLM providers still cannot take it.
  if (!isLLMProvider(providerType)) {
    return null
  }

  const isAssigned =
    config.languageDetection.mode === "llm" && config.languageDetection.providerId === providerId

  return (
    <AssignmentRow
      checked={isAssigned}
      disabled={disabled}
      onCheckedChange={(checked) => {
        if (checked) void actions.assignLanguageDetection()
      }}
    >
      {i18n.t("options.apiProviders.languageDetection.title")}
    </AssignmentRow>
  )
}

function CustomActionAssignments({ disabled = false }: { disabled?: boolean }) {
  const {
    state: {
      assignmentTarget: { providerId, providerType },
    },
    actions,
  } = useProviderEditor()
  const config = useAtomValue(configAtom)

  if (!isLLMProvider(providerType)) {
    return null
  }

  return getSelectionToolbarActions(config.selectionToolbar).map((action) => {
    const isAssigned = action.providerId === providerId
    return (
      <AssignmentRow
        key={action.id}
        checked={isAssigned}
        disabled={disabled}
        onCheckedChange={(checked) => {
          if (checked) void actions.assignCustomAction(action.id)
        }}
      >
        {action.name}
      </AssignmentRow>
    )
  })
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
  Assignments,
  AssignmentRow,
  CompatibleFeatureAssignments,
  LanguageDetectionAssignment,
  CustomActionAssignments,
  DuplicateButton,
  DeleteButton,
}

export const CustomProviderEditor = {
  Provider: CustomProvider,
}
