import { json } from "@remix-run/node"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData, useFetcher } from "@remix-run/react"
import { useEffect, useState, useCallback } from "react"
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Divider,
  Box,
  Badge,
  Banner,
  Checkbox,
  Icon,
} from "@shopify/polaris"
import { ExternalIcon, PaintBrushIcon, CheckIcon } from "@shopify/polaris-icons"
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"
import prisma from "../db.server"

interface WidgetToggles {
  bannerEnabled: boolean
  footerEnabled: boolean
}

const THEME_PRESETS = {
  light: {
    name: "Light",
    description: "Clean, bright theme with green accents",
    colors: { primary: "#2d5a27", secondary: "#4ade80", background: "#f0fdf4", text: "#14532d" }
  },
  dark: {
    name: "Dark",
    description: "Modern dark theme with vibrant greens",
    colors: { primary: "#4ade80", secondary: "#22c55e", background: "#1a2e1a", text: "#f0f9f0" }
  },
  ocean: {
    name: "Ocean",
    description: "Cool blue tones for ocean conservation",
    colors: { primary: "#0ea5e9", secondary: "#38bdf8", background: "#f0f9ff", text: "#0c4a6e" }
  },
  sunset: {
    name: "Sunset",
    description: "Warm orange tones for energy",
    colors: { primary: "#ea580c", secondary: "#fb923c", background: "#fff7ed", text: "#7c2d12" }
  },
  forest: {
    name: "Forest",
    description: "Deep forest greens",
    colors: { primary: "#15803d", secondary: "#22c55e", background: "#f0fdf4", text: "#14532d" }
  },
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop

  // Get widget styles for toggle states
  let widgetStyles = await prisma.shopifyWidgetStyles.findUnique({ where: { shop } })
  
  // Get shop for theme editor URL
  const shopDomain = shop.replace('.myshopify.com', '')

  return json({ 
    toggles: {
      bannerEnabled: widgetStyles?.bannerEnabled ?? true,
      footerEnabled: widgetStyles?.footerEnabled ?? true,
    },
    activePreset: widgetStyles?.widgetTheme ?? 'light',
    shopDomain,
  })
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop
  const formData = await request.formData()
  const actionType = formData.get("action")

  // Ensure core settings exist
  await prisma.shopifySettings.upsert({
    where: { shop },
    update: {},
    create: { shop, triggerType: "fixed", triggerValue: 1 },
  })

  if (actionType === "updateToggles") {
    await prisma.shopifyWidgetStyles.upsert({
      where: { shop },
      update: {
        bannerEnabled: formData.get("bannerEnabled") === "true",
        footerEnabled: formData.get("footerEnabled") === "true",
      },
      create: { 
        shop,
        bannerEnabled: formData.get("bannerEnabled") === "true",
        footerEnabled: formData.get("footerEnabled") === "true",
      },
    })
    return json({ success: true, message: "Widget toggles updated" })
  }

  if (actionType === "applyPreset") {
    const preset = formData.get("preset") as keyof typeof THEME_PRESETS
    if (THEME_PRESETS[preset]) {
      const colors = THEME_PRESETS[preset].colors
      await prisma.shopifyWidgetStyles.upsert({
        where: { shop },
        update: {
          widgetTheme: preset,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          backgroundColor: colors.background,
          textColor: colors.text,
        },
        create: { 
          shop,
          widgetTheme: preset,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          backgroundColor: colors.background,
          textColor: colors.text,
        },
      })
      return json({ success: true, message: `Applied ${THEME_PRESETS[preset].name} theme`, preset })
    }
  }

  return json({ success: false })
}

export default function WidgetCustomization() {
  const { toggles: initialToggles, activePreset, shopDomain } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const shopify = useAppBridge()

  const [toggles, setToggles] = useState<WidgetToggles>(initialToggles)
  const [currentPreset, setCurrentPreset] = useState(activePreset)

  const isSaving = fetcher.state !== "idle"

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message || "Settings saved!")
      if (fetcher.data.preset) {
        setCurrentPreset(fetcher.data.preset)
      }
    }
  }, [fetcher.data, shopify])

  const updateToggle = useCallback((key: keyof WidgetToggles, value: boolean) => {
    setToggles(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSaveToggles = useCallback(() => {
    const formData = new FormData()
    formData.append("action", "updateToggles")
    formData.append("bannerEnabled", String(toggles.bannerEnabled))
    formData.append("footerEnabled", String(toggles.footerEnabled))
    fetcher.submit(formData, { method: "POST" })
  }, [toggles, fetcher])

  const applyPreset = useCallback((preset: string) => {
    const formData = new FormData()
    formData.append("action", "applyPreset")
    formData.append("preset", preset)
    fetcher.submit(formData, { method: "POST" })
  }, [fetcher])

  const themeEditorUrl = `https://admin.shopify.com/store/${shopDomain}/themes/current/editor`

  return (
    <Page>
      <TitleBar title="Widget Customization" />
      <BlockStack gap="500">
        
        {/* Info Banner */}
        <Banner tone="info">
          <p>
            <strong>Visual customization has moved to the Theme Editor!</strong> You can now customize colors, 
            messages, and styles directly in your Shopify theme. Use this page for quick presets and global toggles.
          </p>
        </Banner>

        {/* Quick Actions */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingLg">Quick Setup</Text>
            </InlineStack>
            
            <Text as="p" variant="bodyMd" tone="subdued">
              Enable or disable widgets globally, then customize their appearance in the Theme Editor.
            </Text>
            
            <Divider />

            <Layout>
              <Layout.Section variant="oneHalf">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Global Widget Toggles</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    These settings apply to app embed widgets across your entire store.
                  </Text>
                  
                  <Checkbox
                    label="Enable Announcement Banner"
                    helpText="Shows at the top of your store"
                    checked={toggles.bannerEnabled}
                    onChange={(v) => updateToggle("bannerEnabled", v)}
                  />
                  
                  <Checkbox
                    label="Enable Footer Badge"
                    helpText="Shows a floating badge with total impact"
                    checked={toggles.footerEnabled}
                    onChange={(v) => updateToggle("footerEnabled", v)}
                  />
                  
                  <Button onClick={handleSaveToggles} loading={isSaving}>
                    Save Toggles
                  </Button>
                </BlockStack>
              </Layout.Section>
              
              <Layout.Section variant="oneHalf">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Customize in Theme Editor</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Add widgets to your theme and customize colors, messages, and styles.
                  </Text>
                  
                  <Box paddingBlockStart="200">
                    <Button
                      variant="primary"
                      icon={PaintBrushIcon}
                      url={themeEditorUrl}
                      external
                    >
                      Open Theme Editor
                    </Button>
                  </Box>
                  
                  <Box paddingBlockStart="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      In the Theme Editor, look for our widgets under <strong>"Apps"</strong>:
                    </Text>
                    <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 13, color: '#6b7280' }}>
                      <li>Tree Impact Widget - for product pages</li>
                      <li>Impact Banner - announcement bar</li>
                      <li>Impact Footer Badge - floating badge</li>
                      <li>Virtual Forest Page - full impact page</li>
                    </ul>
                  </Box>
                </BlockStack>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>

        {/* Theme Presets */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">Theme Presets</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Apply a preset color scheme to all widgets with one click. You can further customize in the Theme Editor.
            </Text>
            <Divider />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
              {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                <div
                  key={key}
                  onClick={() => applyPreset(key)}
                  style={{
                    cursor: "pointer",
                    padding: "20px",
                    borderRadius: "12px",
                    border: currentPreset === key ? `2px solid ${preset.colors.primary}` : "2px solid #e5e5e5",
                    background: preset.colors.background,
                    transition: "all 0.2s",
                    position: "relative",
                  }}
                >
                  {currentPreset === key && (
                    <div style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: preset.colors.primary,
                      borderRadius: "50%",
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Icon source={CheckIcon} tone="inherit" />
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: preset.colors.primary }} />
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: preset.colors.secondary }} />
                  </div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    <span style={{ color: preset.colors.text }}>{preset.name}</span>
                  </Text>
                  <Text as="p" variant="bodySm">
                    <span style={{ color: preset.colors.text, opacity: 0.7 }}>{preset.description}</span>
                  </Text>
                </div>
              ))}
            </div>
          </BlockStack>
        </Card>

        {/* Help Section */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingLg">📚 Need Help?</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Learn how to add and customize Afforestation widgets in your store.
            </Text>
            <Divider />
            
            <Layout>
              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Adding Widgets</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Open Theme Editor → Click "Add block" → Select from "Apps"
                  </Text>
                </BlockStack>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Customizing</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Click any widget → Edit colors, messages, and settings in the sidebar
                  </Text>
                </BlockStack>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Multi-language</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Write messages in any language directly in the Theme Editor
                  </Text>
                </BlockStack>
              </Layout.Section>
            </Layout>
            
            <Divider />
            
            <InlineStack gap="300">
              <Button url="https://afforestation.org/docs/shopify" external icon={ExternalIcon}>
                View Documentation
              </Button>
              <Button url="https://afforestation.org/contact" external variant="plain">
                Contact Support
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

      </BlockStack>
    </Page>
  )
}
