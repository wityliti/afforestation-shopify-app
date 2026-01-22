import { json } from "@remix-run/node"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData, useFetcher } from "@remix-run/react"
import { useEffect, useState, useCallback, useRef } from "react"
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
  backgroundColor: "#f0fdf4",
  textColor: "#14532d",
  borderRadius: "rounded",
  borderColor: "#bbf7d0",
  fontFamily: "inherit",
  showAnimation: true,
  animationType: "pulse",
  treeEmoji: "🌳",
  showTreeCount: true,
  customMessage: "This purchase plants {count} tree{s}!",
  forestTheme: "mixed",
  forestBackground: "#fdfdfd",
  showCo2Stats: true,
  forestTitle: "Afforestation's Virtual Forest",
  forestSubtitle: "Watch our forest grow with every purchase",
}

const THEME_PRESETS = {
  light: {
    primaryColor: "#2d5a27",
    secondaryColor: "#4ade80",
    backgroundColor: "#f0fdf4",
    textColor: "#14532d",
    borderColor: "#bbf7d0",
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
  const previewRef = useRef<HTMLDivElement>(null)

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
      // Scroll to preview after save
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
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

        {/* SETTINGS SECTION - TOP */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingLg">Widget Settings</Text>
              <Button variant="primary" onClick={handleSave} loading={isSaving}>
                💾 Save Changes
              </Button>
            </InlineStack>
            
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <Box paddingBlockStart="400">
                {/* Impact Widget Tab */}
                {selectedTab === 0 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">Impact Widget Settings</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      This widget appears on product pages and checkout to show customers their environmental impact.
                    </Text>
                    <Divider />
                    
                    <Layout>
                      <Layout.Section variant="oneHalf">
                        <BlockStack gap="300">
                          <Select
                            label="Tree Icon"
                            options={TREE_EMOJIS.map(e => ({ label: e + " " + e + " " + e, value: e }))}
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
                      </Layout.Section>
                      <Layout.Section variant="oneHalf">
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
                            ]}
                            value={settings.fontFamily}
                            onChange={(v) => updateSetting("fontFamily", v)}
                          />
                        </BlockStack>
                      </Layout.Section>
                    </Layout>

                    <Divider />
                    <Text as="h3" variant="headingMd">Colors</Text>
                    <Layout>
                      <Layout.Section variant="oneThird">
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
                      </Layout.Section>
                      <Layout.Section variant="oneThird">
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
                      </Layout.Section>
                      <Layout.Section variant="oneThird">
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
                      </Layout.Section>
                    </Layout>
                  </BlockStack>
                )}

                {/* Virtual Forest Tab */}
                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">Virtual Forest Settings</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Customize your store's impact page that showcases all trees planted.
                    </Text>
                    <Divider />

                    <Layout>
                      <Layout.Section variant="oneHalf">
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
                      </Layout.Section>
                      <Layout.Section variant="oneHalf">
                        <BlockStack gap="300">
                          <Select
                            label="Forest Theme"
                            options={[
                              { label: "🌳🌲🌴 Mixed Forest", value: "mixed" },
                              { label: "🌲🎄 Pine Forest", value: "pine" },
                              { label: "🌳🍂🍁 Deciduous", value: "deciduous" },
                              { label: "🌴🌺 Tropical", value: "tropical" },
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
                      </Layout.Section>
                    </Layout>

                    <Divider />
                    <Text as="h3" variant="headingMd">Brand Colors</Text>
                    <Layout>
                      <Layout.Section variant="oneHalf">
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
                      </Layout.Section>
                      <Layout.Section variant="oneHalf">
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
                      </Layout.Section>
                    </Layout>
                  </BlockStack>
                )}

                {/* Theme Presets Tab */}
                {selectedTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">Theme Presets</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Choose a pre-designed theme or customize colors to match your brand.
                    </Text>
                    <Divider />

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
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
                    <InlineStack gap="300">
                      <Button onClick={handleReset} tone="critical">
                        Reset All to Defaults
                      </Button>
                    </InlineStack>
                  </BlockStack>
                )}
              </Box>
            </Tabs>
            
            <Divider />
            <InlineStack align="end">
              <Button variant="primary" onClick={handleSave} loading={isSaving}>
                💾 Save Changes
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* PREVIEW SECTION - BOTTOM */}
        <div ref={previewRef}>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingLg">🖥️ Live Preview</Text>
                <Badge>How it will look on your store</Badge>
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued">
                This preview shows exactly how the widgets will appear on your storefront.
              </Text>
              <Divider />

              {/* Simulated Store Preview */}
              <div style={{ 
                background: "#f9fafb", 
                borderRadius: "12px", 
                padding: "24px",
                border: "1px solid #e5e7eb",
              }}>
                {/* Store Header Simulation */}
                <div style={{ 
                  background: "#fff", 
                  padding: "16px 24px", 
                  borderRadius: "8px 8px 0 0",
                  borderBottom: "1px solid #e5e7eb",
                  marginBottom: "0",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text as="p" variant="headingMd">🛍️ Your Store Name</Text>
                    <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "#6b7280" }}>
                      <span>Shop</span>
                      <span>About</span>
                      <span>Contact</span>
                      <span>🛒</span>
                    </div>
                  </div>
                </div>

                {/* Announcement Banner Preview */}
                <div style={{
                  background: settings.primaryColor,
                  color: "#fff",
                  padding: "10px 20px",
                  textAlign: "center",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                }}>
                  <span>{settings.treeEmoji}</span>
                  <span><strong>1%</strong> of every order funds climate action</span>
                  <span style={{ 
                    background: "rgba(255,255,255,0.2)", 
                    padding: "4px 10px", 
                    borderRadius: "20px",
                    fontSize: "12px",
                  }}>Afforestation</span>
                </div>

                {/* Product Page Simulation */}
                <div style={{ 
                  background: "#fff", 
                  padding: "24px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "32px",
                }}>
                  {/* Product Image */}
                  <div style={{ 
                    background: "#f3f4f6", 
                    borderRadius: "8px", 
                    height: "300px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9ca3af",
                  }}>
                    📦 Product Image
                  </div>

                  {/* Product Details */}
                  <div>
                    <Text as="p" variant="bodyMd" tone="subdued">Brand Name</Text>
                    <Text as="p" variant="headingLg">Sample Product Name</Text>
                    <div style={{ margin: "8px 0", fontSize: "14px", color: "#f59e0b" }}>
                      ★★★★★ (127 reviews)
                    </div>
                    <Text as="p" variant="headingMd">$49.99</Text>
                    
                    <div style={{ margin: "16px 0" }}>
                      <Text as="p" variant="bodyMd" tone="subdued">Size</Text>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        {["S", "M", "L", "XL"].map(s => (
                          <div key={s} style={{ 
                            padding: "8px 16px", 
                            border: "1px solid #e5e7eb", 
                            borderRadius: "4px",
                            fontSize: "14px",
                          }}>{s}</div>
                        ))}
                      </div>
                    </div>

                    {/* IMPACT WIDGET PREVIEW */}
                    <div style={{
                      background: settings.backgroundColor,
                      border: `1px solid ${settings.borderColor}`,
                      borderRadius: getBorderRadiusValue(settings.borderRadius),
                      padding: "12px 16px",
                      margin: "16px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontFamily: settings.fontFamily === "inherit" ? "system-ui" : settings.fontFamily,
                    }}>
                      <span style={{ 
                        fontSize: "24px",
                        animation: settings.showAnimation ? `${settings.animationType} 2s infinite` : "none",
                      }}>
                        {settings.treeEmoji}
                      </span>
                      <span style={{ color: settings.textColor, fontSize: "14px" }}>
                        {settings.customMessage
                          .replace("{count}", "1")
                          .replace("{s}", "")}
                      </span>
                    </div>

                    <button style={{
                      width: "100%",
                      padding: "14px",
                      background: "#111",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      cursor: "pointer",
                      marginTop: "8px",
                    }}>
                      Add to Cart
                    </button>
                  </div>
                </div>

                {/* Virtual Forest Preview */}
                <div style={{ 
                  background: settings.forestBackground, 
                  padding: "40px 24px",
                  textAlign: "center",
                  marginTop: "24px",
                  borderRadius: "8px",
                }}>
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    <span style={{ color: settings.primaryColor }}>{settings.forestTitle}</span>
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {settings.forestSubtitle}
                  </Text>
                  
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    gap: "40px", 
                    margin: "24px 0",
                  }}>
                    <div>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: settings.primaryColor }}>
                        127
                      </div>
                      <div style={{ fontSize: "14px", color: settings.textColor }}>Trees Planted</div>
                    </div>
                    {settings.showCo2Stats && (
                      <div>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: settings.secondaryColor }}>
                          3,048
                        </div>
                        <div style={{ fontSize: "14px", color: settings.textColor }}>kg CO₂ Offset</div>
                      </div>
                    )}
                  </div>

                  <div style={{ 
                    display: "flex", 
                    flexWrap: "wrap", 
                    justifyContent: "center", 
                    gap: "8px",
                    padding: "20px",
                    background: "rgba(255,255,255,0.5)",
                    borderRadius: "12px",
                  }}>
                    {Array.from({ length: 16 }).map((_, i) => {
                      const trees = FOREST_THEMES[settings.forestTheme as keyof typeof FOREST_THEMES] || FOREST_THEMES.mixed
                      return (
                        <span key={i} style={{ fontSize: "28px" }}>
                          {trees[i % trees.length]}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Footer Badge Preview */}
                <div style={{ 
                  background: "#fff", 
                  padding: "24px",
                  borderTop: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "24px",
                }}>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>
                    © 2026 Your Store. All rights reserved.
                  </div>
                  <div style={{
                    background: settings.backgroundColor,
                    border: `1px solid ${settings.borderColor}`,
                    borderRadius: "8px",
                    padding: "8px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}>
                    <span style={{ fontSize: "20px" }}>{settings.treeEmoji}</span>
                    <span style={{ fontWeight: "bold", color: settings.primaryColor }}>127</span>
                    <span style={{ fontSize: "12px", color: settings.textColor }}>trees</span>
                  </div>
                </div>
              </div>

              <style>{`
                @keyframes pulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.15); }
                }
                @keyframes bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-4px); }
                }
              `}</style>
            </BlockStack>
          </Card>
        </div>

        {/* Help Card */}
        <Card>
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">📚 Need Help?</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Learn how to add these widgets to your store theme in the Shopify Theme Editor.
            </Text>
            <InlineStack gap="300">
              <Button url="https://afforestation.org/docs/shopify" external>
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
