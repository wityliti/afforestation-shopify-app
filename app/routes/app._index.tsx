import { json } from "@remix-run/node"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import { useEffect, useState, useCallback } from "react"
import { useLoaderData, useFetcher } from "@remix-run/react"
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  Banner,
  Badge,
  Divider,
  ProgressBar,
  Box,
  Checkbox,
  ButtonGroup,
} from "@shopify/polaris"
// Icons removed - using emoji instead for compatibility
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"
import prisma from "../db.server"

interface ImpactData {
  totalTreesPlanted: number
  totalCo2OffsetKg: number
  totalOrders: number
  isLinked: boolean
  companyId: number | null
}

interface Settings {
  triggerType: string
  triggerValue: number
  isEnabled: boolean
  impactType: string
  costPerTree: number
  costPerKgCo2: number
  monthlyLimit: number | null
  monthlySpent: number
  isPaused: boolean
  notifyOnLimit: boolean
  autoResumeMonthly: boolean
  // Loyalty settings
  loyaltyEnabled: boolean
  pointsPerTree: number
  loyaltyApiKey: string | null
}

const DEFAULT_SETTINGS: Settings = {
  triggerType: "fixed",
  triggerValue: 1,
  isEnabled: true,
  impactType: "trees",
  costPerTree: 0.50,
  costPerKgCo2: 0.20,
  monthlyLimit: null,
  monthlySpent: 0,
  isPaused: false,
  notifyOnLimit: true,
  autoResumeMonthly: true,
  // Loyalty defaults
  loyaltyEnabled: false,
  pointsPerTree: 200,
  loyaltyApiKey: null,
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop

  // Get or create settings
  let settings = await prisma.shopifySettings.findUnique({ where: { shop } })
  if (!settings) {
    settings = await prisma.shopifySettings.create({
      data: { shop, triggerType: "fixed", triggerValue: 1 },
    })
  }

  // Get or create shop record
  let shopRecord = await prisma.shopifyShop.findUnique({
    where: { shopDomain: shop }
  })
  if (!shopRecord) {
    shopRecord = await prisma.shopifyShop.create({
      data: { shopDomain: shop },
    })
  }

  // Query impact from the unified impact_ledger
  let impact: ImpactData = {
    totalTreesPlanted: 0,
    totalCo2OffsetKg: 0,
    totalOrders: 0,
    isLinked: shopRecord.companyId !== null,
    companyId: shopRecord.companyId,
  }

  try {
    const impactResult = await prisma.$queryRaw<Array<{
      total_trees_planted: bigint | null
      total_co2_offset_kg: number | null
      total_orders: bigint | null
    }>>`
      SELECT 
        COALESCE(SUM(trees_planted), 0) as total_trees_planted,
        COALESCE(SUM(co2_offset_kg), 0) as total_co2_offset_kg,
        COUNT(*) as total_orders
      FROM impact_ledger
      WHERE source_type = 'shopify' AND source_id = ${shopRecord.id.toString()}
    `

    if (impactResult.length > 0) {
      impact.totalTreesPlanted = Number(impactResult[0].total_trees_planted || 0)
      impact.totalCo2OffsetKg = Number(impactResult[0].total_co2_offset_kg || 0)
      impact.totalOrders = Number(impactResult[0].total_orders || 0)
    }
  } catch (error) {
    console.warn("Could not query impact_ledger:", error)
  }

  return json({
    settings: {
      triggerType: settings.triggerType,
      triggerValue: settings.triggerValue,
      isEnabled: settings.isEnabled,
      impactType: settings.impactType ?? "trees",
      costPerTree: settings.costPerTree ?? 0.50,
      costPerKgCo2: settings.costPerKgCo2 ?? 0.20,
      monthlyLimit: settings.monthlyLimit,
      monthlySpent: settings.monthlySpent ?? 0,
      isPaused: settings.isPaused ?? false,
      notifyOnLimit: settings.notifyOnLimit ?? true,
      autoResumeMonthly: settings.autoResumeMonthly ?? true,
      // Loyalty settings
      loyaltyEnabled: settings.loyaltyEnabled ?? false,
      pointsPerTree: settings.pointsPerTree ?? 200,
      loyaltyApiKey: settings.loyaltyApiKey ?? null,
    },
    impact,
    shopId: shopRecord.id,
    shopName: shop,
  })
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop
  const formData = await request.formData()
  const actionType = formData.get("action")

  if (actionType === "updateSettings") {
    const triggerType = formData.get("triggerType") as string
    const triggerValue = parseFloat(formData.get("triggerValue") as string) || 1
    const impactType = formData.get("impactType") as string
    const monthlyLimit = formData.get("monthlyLimit")
      ? parseFloat(formData.get("monthlyLimit") as string)
      : null
    const notifyOnLimit = formData.get("notifyOnLimit") === "true"
    const autoResumeMonthly = formData.get("autoResumeMonthly") === "true"

    const settings = await prisma.shopifySettings.upsert({
      where: { shop },
      update: {
        triggerType,
        triggerValue,
        impactType,
        monthlyLimit,
        notifyOnLimit,
        autoResumeMonthly,
      },
      create: {
        shop,
        triggerType,
        triggerValue,
        impactType,
        monthlyLimit,
        notifyOnLimit,
        autoResumeMonthly,
      },
    })

    return json({ settings, success: true, message: "Settings saved!" })
  }

  if (actionType === "togglePause") {
    const currentSettings = await prisma.shopifySettings.findUnique({ where: { shop } })
    const newPausedState = !(currentSettings?.isPaused ?? false)

    await prisma.shopifySettings.update({
      where: { shop },
      data: { isPaused: newPausedState },
    })

    return json({
      success: true,
      isPaused: newPausedState,
      message: newPausedState ? "Impact paused" : "Impact resumed"
    })
  }

  if (actionType === "syncMonthlySpent") {
    // Get shop record
    const shopRecord = await prisma.shopifyShop.findUnique({
      where: { shopDomain: shop }
    })

    if (!shopRecord) {
      return json({ success: false, message: "Shop not found" })
    }

    // Get current month's spending from impact_ledger
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const currentSettings = await prisma.shopifySettings.findUnique({ where: { shop } })
    const costPerTree = currentSettings?.costPerTree || 0.5

    const monthlyImpact = await prisma.$queryRaw<Array<{
      total_trees: bigint | null
    }>>`
      SELECT COALESCE(SUM(trees_planted), 0) as total_trees
      FROM impact_ledger
      WHERE source_type IN ('shopify', 'shopify_flow', 'shopify_loyalty')
        AND source_id = ${shopRecord.id.toString()}
        AND created_at >= ${startOfMonth}
    `

    const treesThisMonth = Number(monthlyImpact[0]?.total_trees || 0)
    const calculatedSpent = treesThisMonth * costPerTree

    await prisma.shopifySettings.update({
      where: { shop },
      data: { monthlySpent: calculatedSpent },
    })

    return json({
      success: true,
      monthlySpent: calculatedSpent,
      treesThisMonth,
      message: `Synced: ${treesThisMonth} trees = $${calculatedSpent.toFixed(2)} this month`
    })
  }

  if (actionType === "resetMonthlySpent") {
    await prisma.shopifySettings.update({
      where: { shop },
      data: { monthlySpent: 0 },
    })

    return json({ success: true, message: "Monthly spending reset" })
  }

  if (actionType === "updateLoyaltySettings") {
    const loyaltyEnabled = formData.get("loyaltyEnabled") === "true"
    const pointsPerTree = parseInt(formData.get("pointsPerTree") as string) || 200

    await prisma.shopifySettings.update({
      where: { shop },
      data: {
        loyaltyEnabled,
        pointsPerTree,
      },
    })

    return json({ success: true, message: "Loyalty settings saved!" })
  }

  if (actionType === "generateApiKey") {
    const crypto = await import("crypto")
    const apiKey = `aff_${crypto.randomBytes(24).toString("hex")}`

    await prisma.shopifySettings.update({
      where: { shop },
      data: { loyaltyApiKey: apiKey },
    })

    return json({ success: true, apiKey, message: "API key generated!" })
  }

  if (actionType === "revokeApiKey") {
    await prisma.shopifySettings.update({
      where: { shop },
      data: { loyaltyApiKey: null },
    })

    return json({ success: true, message: "API key revoked" })
  }

  return json({ success: false })
}

export default function Index() {
  const { settings: initialSettings, impact, shopId, shopName } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const shopify = useAppBridge()

  const [settings, setSettings] = useState<Settings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  })

  const isSaving = fetcher.state !== "idle"

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show((fetcher.data as any).message || "Saved!")
    }
    if ((fetcher.data as any)?.isPaused !== undefined) {
      setSettings(prev => ({ ...prev, isPaused: (fetcher.data as any).isPaused }))
    }
    if ((fetcher.data as any)?.apiKey) {
      setSettings(prev => ({ ...prev, loyaltyApiKey: (fetcher.data as any).apiKey }))
    }
    if ((fetcher.data as any)?.monthlySpent !== undefined) {
      setSettings(prev => ({ ...prev, monthlySpent: (fetcher.data as any).monthlySpent }))
    }
  }, [fetcher.data, shopify])

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(() => {
    const formData = new FormData()
    formData.append("action", "updateSettings")
    formData.append("triggerType", settings.triggerType)
    formData.append("triggerValue", settings.triggerValue.toString())
    formData.append("impactType", settings.impactType)
    if (settings.monthlyLimit !== null) {
      formData.append("monthlyLimit", settings.monthlyLimit.toString())
    }
    formData.append("notifyOnLimit", settings.notifyOnLimit.toString())
    formData.append("autoResumeMonthly", settings.autoResumeMonthly.toString())
    fetcher.submit(formData, { method: "POST" })
  }, [settings, fetcher])

  const handleTogglePause = useCallback(() => {
    const formData = new FormData()
    formData.append("action", "togglePause")
    fetcher.submit(formData, { method: "POST" })
  }, [fetcher])

  const getTriggerLabel = () => {
    switch (settings.triggerType) {
      case "fixed": return "Trees per Order"
      case "percentage": return "% of Order Value"
      case "threshold": return "$ Spend per Tree"
      default: return "Value"
    }
  }

  const getTriggerHelpText = () => {
    switch (settings.triggerType) {
      case "fixed": return `Plant ${settings.triggerValue} tree${settings.triggerValue !== 1 ? 's' : ''} for every order`
      case "percentage": return `Donate ${settings.triggerValue}% of each order value to plant trees`
      case "threshold": return `Plant 1 tree for every $${settings.triggerValue} spent`
      default: return ""
    }
  }

  const monthlyProgress = settings.monthlyLimit
    ? Math.min((settings.monthlySpent / settings.monthlyLimit) * 100, 100)
    : 0

  const estimatedCost = impact.totalTreesPlanted * settings.costPerTree +
    impact.totalCo2OffsetKg * settings.costPerKgCo2

  return (
    <Page>
      <TitleBar title="Afforestation Dashboard" />
      <BlockStack gap="500">
        {/* Status Banner */}
        {settings.isPaused && (
          <Banner
            title="Impact is paused"
            tone="warning"
            action={{
              content: "Resume",
              onAction: handleTogglePause,
            }}
          >
            <p>Tree planting is currently paused. No trees will be planted until you resume.</p>
          </Banner>
        )}

        {!impact.isLinked && !settings.isPaused && (
          <Banner
            title="Link your Afforestation account"
            tone="info"
            action={{
              content: "Link Account",
              url: "/app/link-account",
            }}
          >
            <p>Connect to your company account to include this impact in ESG reports.</p>
          </Banner>
        )}

        {/* Impact Overview Cards */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingLg">Your Climate Impact <i className="fi fi-rr-earth-americas" style={{ color: "#2d5a27" }}></i></Text>
                  <ButtonGroup>
                    <Button
                      onClick={handleTogglePause}
                      tone={settings.isPaused ? "success" : undefined}
                    >
                      {settings.isPaused ? "▶ Resume" : "⏸ Pause"}
                    </Button>
                    <Button url="/app/widgets">
                      🌳 Impact Widgets
                    </Button>
                  </ButtonGroup>
                </InlineStack>

                <Divider />

                {/* Stats Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                  <div style={{
                    background: "#fafafa",
                    border: "1px solid #e5e5e5",
                    borderRadius: "12px",
                    padding: "24px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "40px", marginBottom: "8px", color: "#2d5a27" }}><i className="fi fi-rr-tree"></i></div>
                    <Text as="p" variant="heading2xl" fontWeight="bold">
                      {impact.totalTreesPlanted.toLocaleString()}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">Trees Planted</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      ${(impact.totalTreesPlanted * settings.costPerTree).toFixed(2)} funded
                    </Text>
                  </div>

                  <div style={{
                    background: "#fafafa",
                    border: "1px solid #e5e5e5",
                    borderRadius: "12px",
                    padding: "24px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "40px", marginBottom: "8px", color: "#3b82f6" }}><i className="fi fi-rr-cloud"></i></div>
                    <Text as="p" variant="heading2xl" fontWeight="bold">
                      {impact.totalCo2OffsetKg.toLocaleString()}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">kg CO₂ Offset</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      ≈ {(impact.totalCo2OffsetKg / 1000).toFixed(1)} tonnes
                    </Text>
                  </div>

                  <div style={{
                    background: "#fafafa",
                    border: "1px solid #e5e5e5",
                    borderRadius: "12px",
                    padding: "24px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "40px", marginBottom: "8px", color: "#8b5cf6" }}><i className="fi fi-rr-shopping-cart"></i></div>
                    <Text as="p" variant="heading2xl" fontWeight="bold">
                      {impact.totalOrders.toLocaleString()}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">Orders Contributing</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      ${estimatedCost.toFixed(2)} total impact
                    </Text>
                  </div>
                </div>

                {/* Monthly Spending Progress */}
                {settings.monthlyLimit && (
                  <Card>
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">Monthly Spending</Text>
                          <Button
                            size="micro"
                            onClick={() => {
                              const formData = new FormData()
                              formData.append("action", "syncMonthlySpent")
                              fetcher.submit(formData, { method: "POST" })
                            }}
                            loading={isSaving}
                          >
                            🔄 Sync
                          </Button>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">
                          ${settings.monthlySpent.toFixed(2)} / ${settings.monthlyLimit.toFixed(2)}
                        </Text>
                      </InlineStack>
                      <ProgressBar progress={monthlyProgress} tone={monthlyProgress >= 90 ? "critical" : "primary"} />
                      {monthlyProgress >= 90 && (
                        <Text as="p" variant="bodySm" tone="critical">
                          Approaching monthly limit. Impact will pause when limit is reached.
                        </Text>
                      )}
                    </BlockStack>
                  </Card>
                )}

                {/* Account linked banner - hiding since it's redundant when already linked */}
                {/* {impact.isLinked && (
                  <Banner tone="success">
                    <p>Linked to your Afforestation company account. Impact included in ESG dashboard.</p>
                  </Banner>
                )} */}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Impact Settings - Combined Card */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">Impact Settings</Text>

                <InlineStack gap="600" wrap={false} align="start">
                  {/* Impact Type Column */}
                  <Box width="50%">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingSm">Impact Type</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Choose what type of climate action to fund with each order.
                      </Text>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                        {[
                          { id: "trees", icon: <i className="fi fi-rr-tree" style={{ fontSize: "28px", color: "#2d5a27" }}></i>, label: "Trees", price: `$${settings.costPerTree}/tree` },
                          { id: "carbon", icon: <i className="fi fi-rr-cloud" style={{ fontSize: "28px", color: "#3b82f6" }}></i>, label: "Carbon Removal", price: `$${settings.costPerKgCo2}/kg` },
                          { id: "both", icon: <i className="fi fi-rr-earth-americas" style={{ fontSize: "28px", color: "#10b981" }}></i>, label: "Both", price: "Combined impact" },
                        ].map((option) => (
                          <div
                            key={option.id}
                            onClick={() => updateSetting("impactType", option.id)}
                            style={{
                              cursor: "pointer",
                              padding: "16px",
                              borderRadius: "12px",
                              border: settings.impactType === option.id
                                ? "2px solid #2d5a27"
                                : "2px solid #e5e5e5",
                              background: settings.impactType === option.id
                                ? "#f0fdf4"
                                : "#fff",
                              textAlign: "center",
                              transition: "all 0.2s",
                            }}
                          >
                            <div style={{ marginBottom: "6px" }}>{option.icon}</div>
                            <Text as="p" variant="bodySm" fontWeight="semibold">{option.label}</Text>
                            <Text as="p" variant="bodySm" tone="subdued">{option.price}</Text>
                          </div>
                        ))}
                      </div>
                    </BlockStack>
                  </Box>

                  {/* When to Fund Column */}
                  <Box width="50%">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingSm">When to Fund Impact</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Choose how impact is calculated for each order.
                      </Text>
                      <Select
                        label="Trigger Type"
                        options={[
                          { label: "Per Order (fixed trees)", value: "fixed" },
                          { label: "By Percentage of Order Value", value: "percentage" },
                          { label: "By Spend Threshold", value: "threshold" },
                        ]}
                        value={settings.triggerType}
                        onChange={(v) => updateSetting("triggerType", v)}
                      />
                      <TextField
                        label={getTriggerLabel()}
                        type="number"
                        value={settings.triggerValue.toString()}
                        onChange={(v) => updateSetting("triggerValue", parseFloat(v) || 1)}
                        helpText={getTriggerHelpText()}
                        autoComplete="off"
                        min={settings.triggerType === "percentage" ? 0.1 : 1}
                        step={settings.triggerType === "percentage" ? 0.1 : 1}
                      />
                    </BlockStack>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Spending Controls */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Spending Controls</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Set safety limits and stay in control of your environmental spending.
                </Text>
                <Divider />

                <InlineStack gap="400" wrap={false}>
                  <Box width="50%">
                    <TextField
                      label="Monthly Spending Limit ($)"
                      type="number"
                      value={settings.monthlyLimit?.toString() || ""}
                      onChange={(v) => updateSetting("monthlyLimit", v ? parseFloat(v) : null)}
                      placeholder="No limit"
                      helpText="Leave empty for unlimited spending"
                      autoComplete="off"
                    />
                  </Box>
                  <Box width="50%">
                    <BlockStack gap="300">
                      <Checkbox
                        label="Notify me when approaching limit"
                        checked={settings.notifyOnLimit}
                        onChange={(v) => updateSetting("notifyOnLimit", v)}
                      />
                      <Checkbox
                        label="Auto-resume at start of each month"
                        checked={settings.autoResumeMonthly}
                        onChange={(v) => updateSetting("autoResumeMonthly", v)}
                      />
                    </BlockStack>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* 
          ===================================================
          🏆 LOYALTY INTEGRATION - HIDDEN FOR NOW
          To re-enable: uncomment this entire section
          Backend APIs still active at /api/loyalty/*
          ===================================================
        */}
        {/* <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <div>
                    <Text as="h2" variant="headingMd">🏆 Loyalty App Integration</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Let customers redeem loyalty points for tree planting.
                    </Text>
                  </div>
                  <Badge tone={settings.loyaltyEnabled ? "success" : "attention"}>
                    {settings.loyaltyEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </InlineStack>
                <Divider />

                <InlineStack gap="400" wrap={false}>
                  <Box width="50%">
                    <BlockStack gap="300">
                      <Checkbox
                        label="Enable Loyalty Integration"
                        checked={settings.loyaltyEnabled}
                        onChange={(v) => {
                          updateSetting("loyaltyEnabled", v)
                          // Auto-save this setting
                          const formData = new FormData()
                          formData.append("action", "updateLoyaltySettings")
                          formData.append("loyaltyEnabled", v.toString())
                          formData.append("pointsPerTree", settings.pointsPerTree.toString())
                          fetcher.submit(formData, { method: "POST" })
                        }}
                      />
                      <TextField
                        label="Points Per Tree"
                        type="number"
                        value={settings.pointsPerTree.toString()}
                        onChange={(v) => updateSetting("pointsPerTree", parseInt(v) || 200)}
                        helpText="How many loyalty points = 1 tree planted"
                        autoComplete="off"
                        disabled={!settings.loyaltyEnabled}
                      />
                      {settings.loyaltyEnabled && (
                        <Button
                          onClick={() => {
                            const formData = new FormData()
                            formData.append("action", "updateLoyaltySettings")
                            formData.append("loyaltyEnabled", settings.loyaltyEnabled.toString())
                            formData.append("pointsPerTree", settings.pointsPerTree.toString())
                            fetcher.submit(formData, { method: "POST" })
                          }}
                          loading={isSaving}
                        >
                          Save Points Setting
                        </Button>
                      )}
                    </BlockStack>
                  </Box>
                  <Box width="50%">
                    <BlockStack gap="300">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">API Key</Text>
                      {settings.loyaltyApiKey ? (
                        <BlockStack gap="200">
                          <TextField
                            label=""
                            value={settings.loyaltyApiKey}
                            readOnly
                            autoComplete="off"
                          />
                          <Button
                            tone="critical"
                            onClick={() => {
                              const formData = new FormData()
                              formData.append("action", "revokeApiKey")
                              fetcher.submit(formData, { method: "POST" })
                              updateSetting("loyaltyApiKey", null)
                            }}
                          >
                            Revoke API Key
                          </Button>
                        </BlockStack>
                      ) : (
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Generate an API key for loyalty apps to call our redemption endpoints.
                          </Text>
                          <Button
                            onClick={() => {
                              const formData = new FormData()
                              formData.append("action", "generateApiKey")
                              fetcher.submit(formData, { method: "POST" })
                            }}
                            loading={isSaving}
                            disabled={!settings.loyaltyEnabled}
                          >
                            Generate API Key
                          </Button>
                        </BlockStack>
                      )}
                    </BlockStack>
                  </Box>
                </InlineStack>

                {settings.loyaltyEnabled && (
                  <Banner tone="info">
                    <p>
                      <strong>API Endpoints:</strong><br />
                      POST /api/loyalty/redeem - Redeem points for trees<br />
                      GET /api/loyalty/rates - Get redemption rates<br />
                      GET /api/loyalty/impact/:customerId - Customer impact history
                    </p>
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout> */}

        {/* Save Button */}
        <Layout>
          <Layout.Section>
            <InlineStack align="end" gap="300">
              <Button url="/app/widgets">
                🌳 View Impact Widgets
              </Button>
              <Button url="/app/additional">
                ⚙️ Customize Styles
              </Button>
              <Button variant="primary" onClick={handleSave} loading={isSaving}>
                💾 Save All Settings
              </Button>
            </InlineStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  )
}
