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
  TextField,
  Select,
  Checkbox,
  Button,
  Divider,
  Box,
  Badge,
  Banner,
  Tabs,
} from "@shopify/polaris"
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"
import prisma from "../db.server"

interface WidgetSettings {
  widgetTheme: string
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  borderRadius: string
  borderColor: string
  fontFamily: string
  showAnimation: boolean
  animationType: string
  treeEmoji: string
  showTreeCount: boolean
  customMessage: string
  forestTheme: string
  forestBackground: string
  showCo2Stats: boolean
  forestTitle: string
  forestSubtitle: string
}

const DEFAULT_SETTINGS: WidgetSettings = {
  widgetTheme: "light",
  primaryColor: "#2d5a27",
  secondaryColor: "#4ade80",
  backgroundColor: "#f0f9f0",
  textColor: "#1a1a1a",
  borderRadius: "rounded",
  borderColor: "#d4edda",
  fontFamily: "inherit",
  showAnimation: true,
  animationType: "pulse",
  treeEmoji: "🌳",
  showTreeCount: true,
  customMessage: "This purchase plants {count} tree{s}!",
  forestTheme: "mixed",
  forestBackground: "#fdfdfd",
  showCo2Stats: true,
  forestTitle: "Our Virtual Forest",
  forestSubtitle: "Watch our forest grow with every purchase",
}

const THEME_PRESETS = {
  light: {
    primaryColor: "#2d5a27",
    secondaryColor: "#4ade80",
    backgroundColor: "#f0f9f0",
    textColor: "#1a1a1a",
    borderColor: "#d4edda",
    forestBackground: "#fdfdfd",
  },
  dark: {
    primaryColor: "#4ade80",
    secondaryColor: "#22c55e",
    backgroundColor: "#1a2e1a",
    textColor: "#f0f9f0",
    borderColor: "#2d5a27",
    forestBackground: "#0f1f0f",
  },
  ocean: {
    primaryColor: "#0ea5e9",
    secondaryColor: "#38bdf8",
    backgroundColor: "#f0f9ff",
    textColor: "#0c4a6e",
    borderColor: "#bae6fd",
    forestBackground: "#f8fafc",
  },
  sunset: {
    primaryColor: "#ea580c",
    secondaryColor: "#fb923c",
    backgroundColor: "#fff7ed",
    textColor: "#7c2d12",
    borderColor: "#fed7aa",
    forestBackground: "#fffbeb",
  },
  forest: {
    primaryColor: "#15803d",
    secondaryColor: "#22c55e",
    backgroundColor: "#f0fdf4",
    textColor: "#14532d",
    borderColor: "#bbf7d0",
    forestBackground: "#f0fdf4",
  },
}

const TREE_EMOJIS = ["🌳", "🌲", "🌴", "🌿", "🍀", "☘️", "🎋", "🎄"]

const FOREST_THEMES = {
  mixed: ["🌳", "🌲", "🌴", "🌿"],
  pine: ["🌲", "🎄", "🌲", "🎋"],
  deciduous: ["🌳", "🍂", "🍁", "🌳"],
  tropical: ["🌴", "🌺", "🌸", "🌴"],
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop

  let settings = await prisma.shopifySettings.findUnique({ where: { shop } })
  
  if (!settings) {
    settings = await prisma.shopifySettings.create({
      data: { shop, triggerType: "fixed", triggerValue: 1 },
    })
  }

  return json({ settings, shop })
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop
  const formData = await request.formData()
  const actionType = formData.get("action")

  if (actionType === "updateWidgetSettings") {
    const widgetSettings = {
      widgetTheme: formData.get("widgetTheme") as string,
      primaryColor: formData.get("primaryColor") as string,
      secondaryColor: formData.get("secondaryColor") as string,
      backgroundColor: formData.get("backgroundColor") as string,
      textColor: formData.get("textColor") as string,
      borderRadius: formData.get("borderRadius") as string,
      borderColor: formData.get("borderColor") as string,
      fontFamily: formData.get("fontFamily") as string,
      showAnimation: formData.get("showAnimation") === "true",
      animationType: formData.get("animationType") as string,
      treeEmoji: formData.get("treeEmoji") as string,
      showTreeCount: formData.get("showTreeCount") === "true",
      customMessage: formData.get("customMessage") as string,
      forestTheme: formData.get("forestTheme") as string,
      forestBackground: formData.get("forestBackground") as string,
      showCo2Stats: formData.get("showCo2Stats") === "true",
      forestTitle: formData.get("forestTitle") as string,
      forestSubtitle: formData.get("forestSubtitle") as string,
    }

    const settings = await prisma.shopifySettings.upsert({
      where: { shop },
      update: widgetSettings,
      create: { shop, triggerType: "fixed", triggerValue: 1, ...widgetSettings },
    })

    return json({ settings, success: true })
  }

  if (actionType === "resetToDefault") {
    const settings = await prisma.shopifySettings.update({
      where: { shop },
      data: DEFAULT_SETTINGS,
    })
    return json({ settings, success: true, message: "Reset to defaults" })
  }

  if (actionType === "applyPreset") {
    const preset = formData.get("preset") as keyof typeof THEME_PRESETS
    if (THEME_PRESETS[preset]) {
      const settings = await prisma.shopifySettings.update({
        where: { shop },
        data: {
          widgetTheme: preset,
          ...THEME_PRESETS[preset],
        },
      })
      return json({ settings, success: true, message: `Applied ${preset} theme` })
    }
  }

  return json({ success: false })
}

export default function WidgetCustomization() {
  const { settings: initialSettings, shop } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const shopify = useAppBridge()

  const [selectedTab, setSelectedTab] = useState(0)
  const [settings, setSettings] = useState<WidgetSettings>({
    widgetTheme: initialSettings.widgetTheme ?? DEFAULT_SETTINGS.widgetTheme,
    primaryColor: initialSettings.primaryColor ?? DEFAULT_SETTINGS.primaryColor,
    secondaryColor: initialSettings.secondaryColor ?? DEFAULT_SETTINGS.secondaryColor,
    backgroundColor: initialSettings.backgroundColor ?? DEFAULT_SETTINGS.backgroundColor,
    textColor: initialSettings.textColor ?? DEFAULT_SETTINGS.textColor,
    borderRadius: initialSettings.borderRadius ?? DEFAULT_SETTINGS.borderRadius,
    borderColor: initialSettings.borderColor ?? DEFAULT_SETTINGS.borderColor,
    fontFamily: initialSettings.fontFamily ?? DEFAULT_SETTINGS.fontFamily,
    showAnimation: initialSettings.showAnimation ?? DEFAULT_SETTINGS.showAnimation,
    animationType: initialSettings.animationType ?? DEFAULT_SETTINGS.animationType,
    treeEmoji: initialSettings.treeEmoji ?? DEFAULT_SETTINGS.treeEmoji,
    showTreeCount: initialSettings.showTreeCount ?? DEFAULT_SETTINGS.showTreeCount,
    customMessage: initialSettings.customMessage ?? DEFAULT_SETTINGS.customMessage,
    forestTheme: initialSettings.forestTheme ?? DEFAULT_SETTINGS.forestTheme,
    forestBackground: initialSettings.forestBackground ?? DEFAULT_SETTINGS.forestBackground,
    showCo2Stats: initialSettings.showCo2Stats ?? DEFAULT_SETTINGS.showCo2Stats,
    forestTitle: initialSettings.forestTitle ?? DEFAULT_SETTINGS.forestTitle,
    forestSubtitle: initialSettings.forestSubtitle ?? DEFAULT_SETTINGS.forestSubtitle,
  })

  const isSaving = fetcher.state !== "idle"

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message || "Settings saved!")
      if (fetcher.data.settings) {
        setSettings(prev => ({ ...prev, ...fetcher.data.settings }))
      }
    }
  }, [fetcher.data, shopify])

  const updateSetting = useCallback((key: keyof WidgetSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const applyPreset = useCallback((preset: string) => {
    if (THEME_PRESETS[preset as keyof typeof THEME_PRESETS]) {
      const presetColors = THEME_PRESETS[preset as keyof typeof THEME_PRESETS]
      setSettings(prev => ({
        ...prev,
        widgetTheme: preset,
        ...presetColors,
      }))
    }
  }, [])

  const handleSave = useCallback(() => {
    const formData = new FormData()
    formData.append("action", "updateWidgetSettings")
    Object.entries(settings).forEach(([key, value]) => {
      formData.append(key, String(value))
    })
    fetcher.submit(formData, { method: "POST" })
  }, [settings, fetcher])

  const handleReset = useCallback(() => {
    const formData = new FormData()
    formData.append("action", "resetToDefault")
    fetcher.submit(formData, { method: "POST" })
    setSettings(DEFAULT_SETTINGS)
  }, [fetcher])

  const tabs = [
    { id: "impact-widget", content: "Impact Widget", panelID: "impact-widget-panel" },
    { id: "virtual-forest", content: "Virtual Forest", panelID: "virtual-forest-panel" },
    { id: "theme-presets", content: "Theme Presets", panelID: "theme-presets-panel" },
  ]

  const getBorderRadiusValue = (radius: string) => {
    switch (radius) {
      case "sharp": return "0px"
      case "pill": return "50px"
      default: return "8px"
    }
  }

  const getAnimationStyle = () => {
    if (!settings.showAnimation) return {}
    if (settings.animationType === "pulse") {
      return { animation: "pulse 2s infinite" }
    }
    if (settings.animationType === "bounce") {
      return { animation: "bounce 1s infinite" }
    }
    return {}
  }

  // Live Preview Component for Impact Widget
  const ImpactWidgetPreview = () => (
    <div
      style={{
        background: settings.backgroundColor,
        border: `1px solid ${settings.borderColor}`,
        borderRadius: getBorderRadiusValue(settings.borderRadius),
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        fontFamily: settings.fontFamily === "inherit" ? "system-ui" : settings.fontFamily,
      }}
    >
      <span
        style={{
          fontSize: "24px",
          marginRight: "10px",
          ...getAnimationStyle(),
        }}
      >
        {settings.treeEmoji}
      </span>
      <span style={{ color: settings.textColor, fontSize: "14px" }}>
        {settings.customMessage
          .replace("{count}", "1")
          .replace("{s}", "")}
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )

  // Live Preview Component for Virtual Forest
  const VirtualForestPreview = () => {
    const trees = FOREST_THEMES[settings.forestTheme as keyof typeof FOREST_THEMES] || FOREST_THEMES.mixed
    return (
      <div
        style={{
          background: settings.forestBackground,
          borderRadius: "12px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <h3 style={{ color: settings.primaryColor, margin: "0 0 8px", fontSize: "18px" }}>
          {settings.forestTitle}
        </h3>
        <p style={{ color: settings.textColor, margin: "0 0 16px", fontSize: "14px", opacity: 0.7 }}>
          {settings.forestSubtitle}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "16px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: settings.primaryColor }}>
              127
            </div>
            <div style={{ fontSize: "12px", color: settings.textColor, opacity: 0.7 }}>
              Trees Planted
            </div>
          </div>
          {settings.showCo2Stats && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: settings.secondaryColor }}>
                3,048
              </div>
              <div style={{ fontSize: "12px", color: settings.textColor, opacity: 0.7 }}>
                kg CO₂ Offset
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} style={{ fontSize: "24px" }}>
              {trees[i % trees.length]}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Page>
      <TitleBar title="Widget Customization" />
      <BlockStack gap="500">
        <Banner tone="info">
          <p>
            Customize how the Afforestation widgets appear on your storefront. 
            Changes are applied automatically when customers visit your store.
          </p>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <Box padding="400">
                  {/* Impact Widget Tab */}
                  {selectedTab === 0 && (
                    <BlockStack gap="400">
                      <Text as="h2" variant="headingMd">Impact Widget Settings</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        This widget appears on product pages and checkout to show customers their environmental impact.
                      </Text>
                      <Divider />
                      
                      <InlineStack gap="400" wrap={false}>
                        <Box width="50%">
                          <BlockStack gap="300">
                            <Select
                              label="Tree Icon"
                              options={TREE_EMOJIS.map(e => ({ label: e, value: e }))}
                              value={settings.treeEmoji}
                              onChange={(v) => updateSetting("treeEmoji", v)}
                            />
                            <TextField
                              label="Custom Message"
                              value={settings.customMessage}
                              onChange={(v) => updateSetting("customMessage", v)}
                              helpText="Use {count} for tree count and {s} for plural"
                              autoComplete="off"
                            />
                            <Checkbox
                              label="Show tree count in widget"
                              checked={settings.showTreeCount}
                              onChange={(v) => updateSetting("showTreeCount", v)}
                            />
                          </BlockStack>
                        </Box>
                        <Box width="50%">
                          <BlockStack gap="300">
                            <Checkbox
                              label="Enable animation"
                              checked={settings.showAnimation}
                              onChange={(v) => updateSetting("showAnimation", v)}
                            />
                            {settings.showAnimation && (
                              <Select
                                label="Animation Type"
                                options={[
                                  { label: "Pulse", value: "pulse" },
                                  { label: "Bounce", value: "bounce" },
                                ]}
                                value={settings.animationType}
                                onChange={(v) => updateSetting("animationType", v)}
                              />
                            )}
                            <Select
                              label="Border Style"
                              options={[
                                { label: "Rounded", value: "rounded" },
                                { label: "Sharp", value: "sharp" },
                                { label: "Pill", value: "pill" },
                              ]}
                              value={settings.borderRadius}
                              onChange={(v) => updateSetting("borderRadius", v)}
                            />
                            <Select
                              label="Font Family"
                              options={[
                                { label: "Inherit from Store", value: "inherit" },
                                { label: "System Default", value: "system-ui" },
                                { label: "Inter", value: "Inter, sans-serif" },
                                { label: "Roboto", value: "Roboto, sans-serif" },
                                { label: "Poppins", value: "Poppins, sans-serif" },
                              ]}
                              value={settings.fontFamily}
                              onChange={(v) => updateSetting("fontFamily", v)}
                            />
                          </BlockStack>
                        </Box>
                      </InlineStack>

                      <Divider />
                      <Text as="h3" variant="headingMd">Colors</Text>
                      <InlineStack gap="300" wrap>
                        <TextField
                          label="Background"
                          type="text"
                          value={settings.backgroundColor}
                          onChange={(v) => updateSetting("backgroundColor", v)}
                          prefix={
                            <div style={{ width: 20, height: 20, background: settings.backgroundColor, borderRadius: 4, border: "1px solid #ccc" }} />
                          }
                          autoComplete="off"
                        />
                        <TextField
                          label="Text Color"
                          type="text"
                          value={settings.textColor}
                          onChange={(v) => updateSetting("textColor", v)}
                          prefix={
                            <div style={{ width: 20, height: 20, background: settings.textColor, borderRadius: 4, border: "1px solid #ccc" }} />
                          }
                          autoComplete="off"
                        />
                        <TextField
                          label="Border Color"
                          type="text"
                          value={settings.borderColor}
                          onChange={(v) => updateSetting("borderColor", v)}
                          prefix={
                            <div style={{ width: 20, height: 20, background: settings.borderColor, borderRadius: 4, border: "1px solid #ccc" }} />
                          }
                          autoComplete="off"
                        />
                      </InlineStack>
                    </BlockStack>
                  )}

                  {/* Virtual Forest Tab */}
                  {selectedTab === 1 && (
                    <BlockStack gap="400">
                      <Text as="h2" variant="headingMd">Virtual Forest Settings</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Customize your store's impact page that showcases all trees planted.
                      </Text>
                      <Divider />

                      <InlineStack gap="400" wrap={false}>
                        <Box width="50%">
                          <BlockStack gap="300">
                            <TextField
                              label="Page Title"
                              value={settings.forestTitle}
                              onChange={(v) => updateSetting("forestTitle", v)}
                              autoComplete="off"
                            />
                            <TextField
                              label="Page Subtitle"
                              value={settings.forestSubtitle}
                              onChange={(v) => updateSetting("forestSubtitle", v)}
                              autoComplete="off"
                            />
                            <Checkbox
                              label="Show CO₂ statistics"
                              checked={settings.showCo2Stats}
                              onChange={(v) => updateSetting("showCo2Stats", v)}
                            />
                          </BlockStack>
                        </Box>
                        <Box width="50%">
                          <BlockStack gap="300">
                            <Select
                              label="Forest Theme"
                              options={[
                                { label: "Mixed Forest 🌳🌲🌴", value: "mixed" },
                                { label: "Pine Forest 🌲🎄", value: "pine" },
                                { label: "Deciduous 🌳🍂🍁", value: "deciduous" },
                                { label: "Tropical 🌴🌺", value: "tropical" },
                              ]}
                              value={settings.forestTheme}
                              onChange={(v) => updateSetting("forestTheme", v)}
                            />
                            <TextField
                              label="Background Color"
                              type="text"
                              value={settings.forestBackground}
                              onChange={(v) => updateSetting("forestBackground", v)}
                              prefix={
                                <div style={{ width: 20, height: 20, background: settings.forestBackground, borderRadius: 4, border: "1px solid #ccc" }} />
                              }
                              autoComplete="off"
                            />
                          </BlockStack>
                        </Box>
                      </InlineStack>

                      <Divider />
                      <Text as="h3" variant="headingMd">Brand Colors</Text>
                      <InlineStack gap="300" wrap>
                        <TextField
                          label="Primary Color"
                          type="text"
                          value={settings.primaryColor}
                          onChange={(v) => updateSetting("primaryColor", v)}
                          prefix={
                            <div style={{ width: 20, height: 20, background: settings.primaryColor, borderRadius: 4, border: "1px solid #ccc" }} />
                          }
                          autoComplete="off"
                        />
                        <TextField
                          label="Secondary Color"
                          type="text"
                          value={settings.secondaryColor}
                          onChange={(v) => updateSetting("secondaryColor", v)}
                          prefix={
                            <div style={{ width: 20, height: 20, background: settings.secondaryColor, borderRadius: 4, border: "1px solid #ccc" }} />
                          }
                          autoComplete="off"
                        />
                      </InlineStack>
                    </BlockStack>
                  )}

                  {/* Theme Presets Tab */}
                  {selectedTab === 2 && (
                    <BlockStack gap="400">
                      <Text as="h2" variant="headingMd">Theme Presets</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Choose a pre-designed theme or customize colors to match your brand.
                      </Text>
                      <Divider />

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
                        {Object.entries(THEME_PRESETS).map(([name, colors]) => (
                          <div
                            key={name}
                            onClick={() => applyPreset(name)}
                            style={{
                              cursor: "pointer",
                              padding: "16px",
                              borderRadius: "12px",
                              border: settings.widgetTheme === name ? `2px solid ${colors.primaryColor}` : "2px solid #e5e5e5",
                              background: colors.backgroundColor,
                              transition: "all 0.2s",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                              <div style={{ width: 24, height: 24, borderRadius: "50%", background: colors.primaryColor }} />
                              <div style={{ width: 24, height: 24, borderRadius: "50%", background: colors.secondaryColor }} />
                            </div>
                            <Text as="p" variant="bodyMd" fontWeight="semibold">
                              {name.charAt(0).toUpperCase() + name.slice(1)}
                            </Text>
                            {settings.widgetTheme === name && (
                              <Badge tone="success">Active</Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      <Divider />
                      <Button onClick={handleReset} tone="critical">
                        Reset All to Defaults
                      </Button>
                    </BlockStack>
                  )}
                </Box>
              </Tabs>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Live Preview</Text>
                  <Divider />
                  
                  <Text as="h3" variant="headingSm">Impact Widget</Text>
                  <ImpactWidgetPreview />

                  <Text as="h3" variant="headingSm">Virtual Forest</Text>
                  <VirtualForestPreview />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Button variant="primary" onClick={handleSave} loading={isSaving} fullWidth>
                    Save Changes
                  </Button>
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Changes will be visible on your store immediately after saving.
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Need Help?</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Learn how to add widgets to your store theme.
                  </Text>
                  <Button url="https://afforestation.org/docs/shopify" external>
                    View Documentation
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  )
}
