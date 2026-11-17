import type { SerializableProviderRef } from "@/utils/providers/provider-ref"
export interface ProviderRequestRouting<
  Ref extends SerializableProviderRef = SerializableProviderRef,
> {
  providerRef: Ref
}
