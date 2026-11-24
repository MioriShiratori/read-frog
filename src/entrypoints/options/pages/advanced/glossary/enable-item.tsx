import { useAtom } from "jotai"
import { Switch } from "@/components/ui/base-ui/switch"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { ConfigItem } from "../../../components/config-item"

export function GlossaryEnableItem() {
  const [glossary, setGlossary] = useAtom(configFieldsAtomMap.glossary)

  return (
    <ConfigItem
      id="glossary-enabled"
      title={i18n.t("options.advanced.glossary.enable.title")}
      description={i18n.t("options.advanced.glossary.enable.description")}
    >
      <Switch
        checked={glossary.enabled}
        onCheckedChange={(checked) => {
          void setGlossary({ ...glossary, enabled: checked })
        }}
      />
    </ConfigItem>
  )
}
