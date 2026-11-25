// Frozen migration boundary: legacy untyped config is validated after migration.
export function migrate(oldConfig: any): any {
  if (
    !oldConfig ||
    typeof oldConfig !== "object" ||
    Array.isArray(oldConfig) ||
    !oldConfig.pageTranslation ||
    typeof oldConfig.pageTranslation !== "object" ||
    Array.isArray(oldConfig.pageTranslation) ||
    !oldConfig.pageTranslation.page ||
    typeof oldConfig.pageTranslation.page !== "object" ||
    Array.isArray(oldConfig.pageTranslation.page)
  ) {
    return oldConfig
  }

  if (typeof oldConfig.pageTranslation.page.showOriginalOnHover === "boolean") {
    return oldConfig
  }

  return {
    ...oldConfig,
    pageTranslation: {
      ...oldConfig.pageTranslation,
      page: {
        ...oldConfig.pageTranslation.page,
        showOriginalOnHover: false,
      },
    },
  }
}
