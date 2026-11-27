// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Provider } from "jotai"
import { MemoryRouter, useLocation } from "react-router"
import { afterEach, expect, it, vi } from "vitest"
import { SidebarProvider } from "@/components/ui/base-ui/sidebar"
import App from "../../../app"
import { FeaturesNav } from "../../../app-sidebar/features-nav"

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }))
afterEach(cleanup)

function CurrentPage() {
  return useLocation().pathname === "/" ? null : <App />
}

it("opens the image translation page from the Overlay Tools category", async () => {
  render(
    <Provider>
      <MemoryRouter>
        <SidebarProvider>
          <FeaturesNav />
          <CurrentPage />
        </SidebarProvider>
      </MemoryRouter>
    </Provider>,
  )
  fireEvent.click(screen.getByRole("button", { name: "options.overlayTools.title" }))
  fireEvent.click(screen.getByRole("link", { name: "imageTranslation.title" }))
  expect(
    await screen.findByRole("heading", { level: 1, name: "imageTranslation.title" }),
  ).toBeVisible()
  expect(screen.getByText("imageTranslation.settings.usage.open")).toBeVisible()
  expect(screen.getByText("imageTranslation.settings.usage.select")).toBeVisible()
  expect(
    screen.getByRole("link", { name: /imageTranslation.settings.provider.title/ }),
  ).toHaveAttribute("href", "/api-providers")
  expect(
    screen.getByRole("link", { name: /imageTranslation.settings.languages.title/ }),
  ).toHaveAttribute("href", "/preference")
})
