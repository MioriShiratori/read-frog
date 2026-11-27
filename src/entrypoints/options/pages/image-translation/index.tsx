import { i18n } from "@/utils/i18n"
import { ConfigNavItem } from "../../components/config-nav-item"
import { ConfigSection } from "../../components/config-section"
import { PageLayout } from "../../components/page-layout"
import { EnableItem } from "../floating-button/enable-item"
import { FloatingButtonPreview } from "../floating-button/floating-button-preview"

export function ImageTranslationPage() {
  return (
    <PageLayout
      title={i18n.t("imageTranslation.title")}
      description={i18n.t("imageTranslation.settings.description")}
      innerClassName="flex flex-col gap-10"
    >
      <FloatingButtonPreview />
      <EnableItem />
      <ConfigSection
        id="image-translation-usage"
        title={i18n.t("imageTranslation.settings.usage.title")}
      >
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
          <li>{i18n.t("imageTranslation.settings.usage.open")}</li>
          <li>{i18n.t("imageTranslation.settings.usage.select")}</li>
          <li>{i18n.t("imageTranslation.settings.usage.restore")}</li>
        </ol>
      </ConfigSection>
      <ConfigSection title={i18n.t("imageTranslation.settings.configuration")}>
        <p className="text-sm text-muted-foreground">
          {i18n.t("imageTranslation.settings.localOcr")}
        </p>
        <ConfigNavItem
          to="/api-providers"
          title={i18n.t("imageTranslation.settings.provider.title")}
          description={i18n.t("imageTranslation.settings.provider.description")}
        />
        <ConfigNavItem
          to="/preference"
          title={i18n.t("imageTranslation.settings.languages.title")}
          description={i18n.t("imageTranslation.settings.languages.description")}
        />
        <ConfigNavItem
          to="/floating-button"
          title={i18n.t("options.floatingButton.title")}
          description={i18n.t("imageTranslation.settings.floatingButtonDescription")}
        />
      </ConfigSection>
    </PageLayout>
  )
}
