import type { APIProviderConfig } from "@/types/config/provider"
import { useSelector } from "@tanstack/react-store"
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/base-ui/select"
import { AI_SDK_REASONING_VALUES, isLLMProviderConfig } from "@/types/config/provider"
import { i18n } from "@/utils/i18n"
import { getMinimumReasoning } from "@/utils/providers/reasoning"
import { withForm } from "./form"

export const ReasoningField = withForm({
  ...{ defaultValues: {} as APIProviderConfig },
  render: function Render({ form }) {
    const providerConfig = useSelector(form.store, (state) => state.values)

    if (!isLLMProviderConfig(providerConfig)) return null
    const minimum = getMinimumReasoning(providerConfig)

    return (
      <div className="space-y-2">
        <form.AppField name="reasoning">
          {(field) => (
            <field.SelectFieldAutoSave label={i18n.t("options.apiProviders.form.reasoning.title")}>
              <SelectTrigger
                className="w-full"
                aria-label={i18n.t("options.apiProviders.form.reasoning.title")}
              >
                <SelectValue placeholder="none" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {AI_SDK_REASONING_VALUES.map((reasoning) => (
                    <SelectItem key={reasoning} value={reasoning}>
                      {reasoning}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </field.SelectFieldAutoSave>
          )}
        </form.AppField>
        <p className="text-xs text-muted-foreground">
          {i18n.t("options.apiProviders.form.reasoning.description")}
        </p>
        {minimum && (
          <p role="status" className="text-xs text-muted-foreground">
            {i18n.t("options.apiProviders.form.reasoning.minimum", [minimum.label])}
          </p>
        )}
      </div>
    )
  },
})
